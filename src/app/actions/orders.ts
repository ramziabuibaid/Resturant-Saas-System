"use server";

import { randomBytes } from "node:crypto";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import { toMenuItemDto } from "@/lib/data/menu";
import {
  ensureCustomer,
  finalizeCompletedOrder,
  findCustomerByPhone,
  normalizePhone,
  redeemCashInTx,
} from "@/lib/loyalty/core";
import { resolveUnitPriceCents } from "@/lib/order-pricing";
import { normalizeExcludedForDb } from "@/lib/order-exclusions";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import type {
  GuestOrderItem,
  GuestOrderWithDetails,
  OrderFulfillment,
  OrderStatus,
} from "@/lib/types/database";

/*
 * الطلبات. دوال الزبون (createGuestOrder، getCheckoutLoyaltyPreview، getOrderTrackingByToken)
 * عامة بطبيعتها؛ بقية الدوال تتطلب جلسة صاحب المطعم وتعمل على طلبات مطعمه فقط.
 */

const ORDER_STATUSES: OrderStatus[] = ["pending", "accepted", "preparing", "ready", "completed", "cancelled"];
const FULFILLMENTS: OrderFulfillment[] = ["dine_in", "pickup", "delivery"];

function revalidateOrderPaths() {
  revalidatePath("/admin/orders");
}

async function findRestaurantBySubdomain(subdomain: string) {
  const [r] = await db
    .select()
    .from(schema.restaurants)
    .where(eq(schema.restaurants.subdomain, subdomain.trim().toLowerCase()))
    .limit(1);
  return r ?? null;
}

// ---------------------------------------------------------------------------
// الزبون: معاينة النقاط وإنشاء الطلب
// ---------------------------------------------------------------------------

export type CreateGuestOrderInput = {
  subdomain: string;
  /** من رابط QR */
  tableToken: string | null;
  fulfillment: OrderFulfillment;
  /** عند الطلب من داخل المطعم بدون QR */
  tableId: string | null;
  deliveryAddress: string | null;
  customerPhone: string;
  items: {
    menuItemId: string;
    quantity: number;
    priceOptionLabel: string | null;
    /** مكوّنات لا يريدها الزبون في الطبق */
    excludedIngredients?: string[];
  }[];
  /** عدد النقاط المراد استبدالها نقدياً ضمن هذا الطلب (اختياري) */
  loyaltyPointsToRedeem?: number;
};

/** معاينة رصيد النقاط لصفحة إتمام الطلب من المنيو (بدون تسجيل دخول). */
export async function getCheckoutLoyaltyPreview(input: { subdomain: string; customerPhone: string }): Promise<
  | {
      ok: true;
      programEnabled: boolean;
      pointsBalance: number;
      pointValueCents: number;
      spendCentsPerPoint: number;
    }
  | { ok: false; error: string }
> {
  const phone = normalizePhone(input.customerPhone);
  if (!input.subdomain?.trim() || !phone) return { ok: false, error: "بيانات غير صالحة" };
  if (!rateLimit(`preview:${clientIp(await headers())}`, 30, 60_000)) {
    return { ok: false, error: "محاولات كثيرة، انتظر قليلاً" };
  }

  const restaurant = await findRestaurantBySubdomain(input.subdomain);
  if (!restaurant) return { ok: false, error: "المطعم غير موجود" };
  const customer = await findCustomerByPhone(restaurant.id, phone);
  return {
    ok: true,
    programEnabled: restaurant.loyaltyProgramEnabled,
    pointsBalance: customer?.pointsBalance ?? 0,
    pointValueCents: Math.max(1, restaurant.loyaltyPointValueCents),
    spendCentsPerPoint: Math.max(1, restaurant.loyaltySpendCentsPerPoint),
  };
}

export type CreateGuestOrderResult =
  | { ok: true; orderId: string; displayNumber: number; trackingToken: string }
  | { ok: false; error: string };

/** خطأ متوقع يُعرض للزبون كما هو (ويلغي المعاملة) */
class OrderError extends Error {}

export async function createGuestOrder(input: CreateGuestOrderInput): Promise<CreateGuestOrderResult> {
  const phone = normalizePhone(input.customerPhone);
  if (!phone) return { ok: false, error: "رقم الجوال غير صالح (8–15 رقماً)" };
  if (!Array.isArray(input.items) || !input.items.length) return { ok: false, error: "السلة فارغة" };
  if (input.items.length > 50) return { ok: false, error: "عدد الأصناف كبير جداً" };
  if (!FULFILLMENTS.includes(input.fulfillment)) return { ok: false, error: "نوع الطلب غير صالح" };

  const restaurant = await findRestaurantBySubdomain(input.subdomain ?? "");
  if (!restaurant) return { ok: false, error: "المطعم غير موجود" };
  if (restaurant.status === "suspended") return { ok: false, error: "المطعم غير متاح حالياً" };

  // حد بسيط ضد الإغراق: 10 طلبات كل 10 دقائق لكل جهاز ومطعم
  if (!rateLimit(`order:${restaurant.id}:${clientIp(await headers())}`, 10, 10 * 60_000)) {
    return { ok: false, error: "طلبات كثيرة من هذا الجهاز، حاول بعد قليل" };
  }

  const restaurantId = restaurant.id;

  // الطاولة: من رمز QR أو من اختيار الزبون
  let tableId: string | null = null;
  let waiterId: string | null = null;
  const tableToken = input.tableToken?.trim();
  if (tableToken || input.fulfillment === "dine_in") {
    if (input.fulfillment !== "dine_in") return { ok: false, error: "طلب الطاولة يجب أن يكون للتناول داخل المطعم" };
    const where = tableToken
      ? /^[0-9a-f-]{36}$/i.test(tableToken)
        ? eq(schema.restaurantTables.publicToken, tableToken)
        : null
      : input.tableId && /^[0-9a-f-]{36}$/i.test(input.tableId)
        ? eq(schema.restaurantTables.id, input.tableId)
        : null;
    if (!where) return { ok: false, error: tableToken ? "رابط الطاولة غير صالح" : "اختر رقم الطاولة" };
    const [t] = await db
      .select({ id: schema.restaurantTables.id, waiterId: schema.restaurantTables.waiterId })
      .from(schema.restaurantTables)
      .where(and(eq(schema.restaurantTables.restaurantId, restaurantId), where))
      .limit(1);
    if (!t) return { ok: false, error: tableToken ? "رابط الطاولة غير صالح" : "الطاولة غير صالحة" };
    tableId = t.id;
    waiterId = t.waiterId;
  }

  let deliveryAddress: string | null = null;
  if (input.fulfillment === "delivery") {
    const addr = input.deliveryAddress?.trim();
    if (!addr || addr.length < 5) return { ok: false, error: "عنوان التوصيل مطلوب" };
    deliveryAddress = addr.slice(0, 500);
  }

  // الأسعار تُحسب من قاعدة البيانات — لا نثق بأي سعر من المتصفح
  const itemIds = [...new Set(input.items.map((i) => i.menuItemId).filter((id) => /^[0-9a-f-]{36}$/i.test(id)))];
  if (!itemIds.length) return { ok: false, error: "صنف غير موجود" };
  const menuRows = await db
    .select()
    .from(schema.menuItems)
    .where(and(eq(schema.menuItems.restaurantId, restaurantId), inArray(schema.menuItems.id, itemIds)));
  const byId = new Map(menuRows.map((r) => [r.id, r]));

  const lines: (typeof schema.orderItems.$inferInsert)[] = [];
  for (const row of input.items) {
    const item = byId.get(row.menuItemId);
    if (!item) return { ok: false, error: "صنف غير موجود" };
    if (!item.isAvailable) return { ok: false, error: `غير متاح: ${item.name}` };
    const excluded = normalizeExcludedForDb(row.excludedIngredients ?? []);
    if (!excluded.ok) return { ok: false, error: "قائمة المكوّنات المستبعدة غير صالحة" };
    const price = resolveUnitPriceCents(toMenuItemDto(item), row.priceOptionLabel);
    if (!price.ok) return { ok: false, error: `اختر حجم السعر لـ ${item.name}` };
    const quantity = Math.min(99, Math.max(1, Math.floor(Number(row.quantity) || 1)));
    lines.push({
      orderId: "", // يُملأ داخل المعاملة
      menuItemId: item.id,
      itemName: item.name,
      priceOptionLabel: row.priceOptionLabel?.trim() || null,
      quantity,
      unitPriceCents: price.cents,
      lineTotalCents: price.cents * quantity,
      excludedIngredients: excluded.value,
    });
  }
  const orderTotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  const requestedRedeem = Math.max(0, Math.floor(Number(input.loyaltyPointsToRedeem ?? 0)));
  const pointValueCents = Math.max(1, restaurant.loyaltyPointValueCents);

  try {
    const created = await db.transaction(async (tx) => {
      // رقم الطلب: زيادة ذرّية (قفل صف المطعم يرتّب الطلبات المتزامنة)
      const [{ n }] = await tx
        .update(schema.restaurants)
        .set({ lastOrderNumber: sql`${schema.restaurants.lastOrderNumber} + 1` })
        .where(eq(schema.restaurants.id, restaurantId))
        .returning({ n: schema.restaurants.lastOrderNumber });

      const customer = await ensureCustomer(tx, restaurantId, phone);
      await tx
        .update(schema.customers)
        .set({ orderCount: sql`${schema.customers.orderCount} + 1`, lastOrderAt: new Date() })
        .where(eq(schema.customers.id, customer.id));

      const trackingToken = randomBytes(32).toString("hex");
      const [order] = await tx
        .insert(schema.orders)
        .values({
          restaurantId,
          displayNumber: n,
          trackingToken,
          fulfillment: input.fulfillment,
          tableId,
          waiterId,
          customerId: customer.id,
          customerPhone: phone,
          deliveryAddress,
        })
        .returning({ id: schema.orders.id });

      await tx.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId: order.id })));

      // استبدال النقاط (الكسب يحدث عند اكتمال الطلب)
      if (restaurant.loyaltyProgramEnabled && requestedRedeem > 0 && orderTotalCents > 0) {
        const maxByOrder = Math.floor(orderTotalCents / pointValueCents);
        const r = await redeemCashInTx(tx, {
          restaurantId,
          customerId: customer.id,
          orderId: order.id,
          pointsRequested: Math.min(requestedRedeem, maxByOrder),
          pointValueCents,
        });
        if (r.points < Math.min(requestedRedeem, maxByOrder)) {
          throw new OrderError("رصيد النقاط غير كافٍ. قلّل عدد النقاط ثم أعد المحاولة.");
        }
        await tx
          .update(schema.orders)
          .set({ loyaltyPointsUsed: r.points, loyaltyDiscountCents: r.discountCents })
          .where(eq(schema.orders.id, order.id));
      }

      return { orderId: order.id, displayNumber: n, trackingToken };
    });

    revalidateOrderPaths();
    return { ok: true, ...created };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    console.error("createGuestOrder failed", e);
    return { ok: false, error: "تعذر إرسال الطلب، حاول مرة أخرى" };
  }
}

// ---------------------------------------------------------------------------
// لوحة المطعم: قائمة الطلبات
// ---------------------------------------------------------------------------

export async function listRestaurantOrders(options?: {
  status?: OrderStatus;
  limit?: number;
}): Promise<{ orders: GuestOrderWithDetails[]; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const limit = Math.min(100, Math.max(1, options?.limit ?? 50));

  const orderRows = await db
    .select()
    .from(schema.orders)
    .where(
      options?.status && ORDER_STATUSES.includes(options.status)
        ? and(eq(schema.orders.restaurantId, rid), eq(schema.orders.status, options.status))
        : eq(schema.orders.restaurantId, rid)
    )
    .orderBy(desc(schema.orders.createdAt))
    .limit(limit);
  if (!orderRows.length) return { orders: [], error: null };
  const ids = orderRows.map((o) => o.id);

  const [restaurant] = await db
    .select({
      enabled: schema.restaurants.loyaltyProgramEnabled,
      pointValue: schema.restaurants.loyaltyPointValueCents,
    })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, rid));

  const tableIds = [...new Set(orderRows.map((o) => o.tableId).filter((x): x is string => !!x))];
  const phones = [...new Set(orderRows.map((o) => o.customerPhone))];

  const [tables, items, earns, customers] = await Promise.all([
    tableIds.length
      ? db
          .select({ id: schema.restaurantTables.id, label: schema.restaurantTables.label, waiterId: schema.restaurantTables.waiterId })
          .from(schema.restaurantTables)
          .where(inArray(schema.restaurantTables.id, tableIds))
      : [],
    db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, ids)),
    db
      .select({ orderId: schema.loyaltyTransactions.orderId, points: schema.loyaltyTransactions.pointsDelta })
      .from(schema.loyaltyTransactions)
      .where(and(inArray(schema.loyaltyTransactions.orderId, ids), eq(schema.loyaltyTransactions.txType, "earn"))),
    db
      .select({ phone: schema.customers.phoneNormalized, balance: schema.customers.pointsBalance })
      .from(schema.customers)
      .where(and(eq(schema.customers.restaurantId, rid), inArray(schema.customers.phoneNormalized, phones))),
  ]);

  const tableById = new Map(tables.map((t) => [t.id, t]));
  const waiterIds = new Set<string>();
  for (const o of orderRows) {
    const wid = o.waiterId ?? (o.tableId ? tableById.get(o.tableId)?.waiterId : null);
    if (wid) waiterIds.add(wid);
  }
  const waiters = waiterIds.size
    ? await db
        .select({ id: schema.restaurantWaiters.id, name: schema.restaurantWaiters.name })
        .from(schema.restaurantWaiters)
        .where(inArray(schema.restaurantWaiters.id, [...waiterIds]))
    : [];
  const waiterName = new Map(waiters.map((w) => [w.id, w.name]));
  const earnedByOrder = new Map(earns.map((e) => [e.orderId, e.points]));
  const balanceByPhone = new Map(customers.map((c) => [c.phone, c.balance]));

  const itemsByOrder = new Map<string, GuestOrderItem[]>();
  for (const r of items) {
    const list = itemsByOrder.get(r.orderId) ?? [];
    list.push({
      id: r.id,
      order_id: r.orderId,
      menu_item_id: r.menuItemId ?? "",
      quantity: r.quantity,
      unit_price_cents: r.unitPriceCents,
      price_option_label: r.priceOptionLabel,
      line_total_cents: r.lineTotalCents,
      excluded_ingredients: r.excludedIngredients.length ? r.excludedIngredients : undefined,
      menu_item_name: r.itemName,
    });
    itemsByOrder.set(r.orderId, list);
  }

  const loyaltyOn = restaurant?.enabled === true;
  const pv = Math.max(1, restaurant?.pointValue ?? 10);

  const orders: GuestOrderWithDetails[] = orderRows.map((o) => {
    const lineItems = itemsByOrder.get(o.id) ?? [];
    const subtotal = lineItems.reduce((s, i) => s + i.line_total_cents, 0);
    const redeemBase = Math.max(0, subtotal - o.ownerDiscountCents);
    const balance = balanceByPhone.get(o.customerPhone) ?? 0;
    const maxPts = loyaltyOn && redeemBase > 0 ? Math.min(balance, Math.floor(redeemBase / pv)) : 0;
    const ownerCan =
      loyaltyOn &&
      o.loyaltyDiscountCents === 0 &&
      o.loyaltyPointsUsed === 0 &&
      maxPts > 0 &&
      o.status !== "cancelled" &&
      o.status !== "completed";
    const table = o.tableId ? tableById.get(o.tableId) : undefined;
    const twid = o.waiterId ?? table?.waiterId ?? null;

    return {
      id: o.id,
      restaurant_id: o.restaurantId,
      table_id: o.tableId,
      waiter_id: o.waiterId,
      fulfillment: o.fulfillment,
      delivery_address: o.deliveryAddress,
      customer_phone: o.customerPhone,
      status: o.status,
      display_number: o.displayNumber,
      tracking_token: o.trackingToken,
      created_at: o.createdAt.toISOString(),
      loyalty_points_used: o.loyaltyPointsUsed,
      loyalty_discount_cents: o.loyaltyDiscountCents,
      staff_notes: o.staffNotes,
      owner_discount_cents: o.ownerDiscountCents,
      completion_accounting_done: o.completionAccountingDone,
      loyalty_points_earned_on_order: earnedByOrder.get(o.id) ?? 0,
      table_label: table?.label ?? null,
      table_waiter_id: twid,
      waiter_name: twid ? waiterName.get(twid) ?? null : null,
      items: lineItems,
      customer_loyalty_points_balance: balance,
      owner_can_apply_loyalty_redeem: ownerCan,
      owner_redeem_max_points: ownerCan ? maxPts : 0,
      owner_redeem_max_discount_cents: ownerCan ? maxPts * pv : 0,
    };
  });

  return { orders, error: null };
}

// ---------------------------------------------------------------------------
// لوحة المطعم: تعديلات الطاقم
// ---------------------------------------------------------------------------

async function ownOrder(orderId: string, restaurantId: string) {
  const [o] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.restaurantId, restaurantId)))
    .limit(1);
  return o ?? null;
}

/** الأصناف والخصم اليدوي قابلة للتعديل قبل الاكتمال وقبل تطبيق خصم النقاط */
function structureLockReason(o: typeof schema.orders.$inferSelect): string | null {
  if (o.status === "completed" || o.status === "cancelled") return "لا يمكن تعديل طلب مكتمل أو ملغى";
  if (o.loyaltyPointsUsed > 0 || o.loyaltyDiscountCents > 0)
    return "لا يمكن تعديل الأصناف أو الخصم اليدوي بعد تطبيق خصم النقاط.";
  return null;
}

async function orderSubtotal(orderId: string) {
  const [{ s }] = await db
    .select({ s: sql<number>`coalesce(sum(${schema.orderItems.lineTotalCents}), 0)::int` })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, orderId));
  return s;
}

/** بعد تعديل الأصناف: الخصم اليدوي لا يتجاوز المجموع الجديد */
async function clampOwnerDiscount(orderId: string) {
  const sub = await orderSubtotal(orderId);
  await db
    .update(schema.orders)
    .set({ ownerDiscountCents: sql`least(${schema.orders.ownerDiscountCents}, ${sub})` })
    .where(eq(schema.orders.id, orderId));
}

/** تطبيق أقصى خصم بالنقاط على طلب من لوحة المالك (استبدال فقط؛ الكسب عند اكتمال الطلب). */
export async function applyOwnerLoyaltyRedeemToOrder(
  orderId: string
): Promise<{ ok: true; pointsRedeemed: number; discountCents: number } | { ok: false; error: string }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;

  const [restaurant] = await db
    .select({ enabled: schema.restaurants.loyaltyProgramEnabled, pointValue: schema.restaurants.loyaltyPointValueCents })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, rid));
  if (!restaurant?.enabled) return { ok: false, error: "برنامج الولاء غير مفعّل" };
  const pointValueCents = Math.max(1, restaurant.pointValue);

  try {
    const r = await db.transaction(async (tx) => {
      const [o] = await tx
        .select()
        .from(schema.orders)
        .where(and(eq(schema.orders.id, orderId), eq(schema.orders.restaurantId, rid)))
        .for("update");
      if (!o) throw new OrderError("الطلب غير موجود");
      if (o.status === "cancelled") throw new OrderError("لا يمكن تطبيق خصم على طلب ملغى");
      if (o.status === "completed")
        throw new OrderError("لا يمكن تطبيق خصم النقاط بعد اكتمال الطلب. طبّق الخصم قبل وضع الطلب كمكتمل.");
      if (o.loyaltyDiscountCents > 0 || o.loyaltyPointsUsed > 0)
        throw new OrderError("تم تطبيق خصم نقاط على هذا الطلب مسبقاً");
      const phone = normalizePhone(o.customerPhone);
      if (!phone) throw new OrderError("رقم الجوال غير صالح");

      const [{ s }] = await tx
        .select({ s: sql<number>`coalesce(sum(${schema.orderItems.lineTotalCents}), 0)::int` })
        .from(schema.orderItems)
        .where(eq(schema.orderItems.orderId, orderId));
      const base = Math.max(0, s - o.ownerDiscountCents);
      if (base <= 0) throw new OrderError("مبلغ الطلب غير صالح بعد الخصم اليدوي");

      const customer = await ensureCustomer(tx, rid, phone);
      const redeemed = await redeemCashInTx(tx, {
        restaurantId: rid,
        customerId: customer.id,
        orderId,
        pointsRequested: Math.floor(base / pointValueCents),
        pointValueCents,
      });
      if (redeemed.points <= 0) throw new OrderError("لا يوجد رصيد نقاط كافٍ أو مبلغ الطلب لا يسمح بالاستبدال");

      await tx
        .update(schema.orders)
        .set({ loyaltyPointsUsed: redeemed.points, loyaltyDiscountCents: redeemed.discountCents })
        .where(eq(schema.orders.id, orderId));
      return redeemed;
    });

    revalidateOrderPaths();
    revalidatePath("/admin/customers");
    return { ok: true, pointsRedeemed: r.points, discountCents: r.discountCents };
  } catch (e) {
    if (e instanceof OrderError) return { ok: false, error: e.message };
    throw e;
  }
}

/** تعيين أو إلغاء تعيين الويتر على الطلب يدوياً */
export async function updateOrderWaiter(orderId: string, waiterId: string | null): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  if (waiterId) {
    const [w] = await db
      .select({ id: schema.restaurantWaiters.id })
      .from(schema.restaurantWaiters)
      .where(and(eq(schema.restaurantWaiters.id, waiterId), eq(schema.restaurantWaiters.restaurantId, rid)))
      .limit(1);
    if (!w) return { error: "الويتر غير موجود" };
  }
  await db
    .update(schema.orders)
    .set({ waiterId })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.restaurantId, rid)));
  revalidateOrderPaths();
  return { error: null };
}

/** ملاحظات داخلية للطاقم — مسموح حتى للطلبات المكتملة ما عدا الملغاة */
export async function updateOrderStaffNotes(orderId: string, notes: string | null): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const o = await ownOrder(orderId, restaurant_id!);
  if (!o) return { error: "الطلب غير موجود" };
  if (o.status === "cancelled") return { error: "لا يمكن تعديل طلب ملغى" };
  const trimmed = notes?.trim().slice(0, 2000) ?? "";
  await db.update(schema.orders).set({ staffNotes: trimmed || null }).where(eq(schema.orders.id, o.id));
  revalidateOrderPaths();
  return { error: null };
}

export async function setOrderOwnerDiscount(orderId: string, discountCents: number): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const o = await ownOrder(orderId, restaurant_id!);
  if (!o) return { error: "الطلب غير موجود" };
  const locked = structureLockReason(o);
  if (locked) return { error: locked };
  const d = Math.max(0, Math.floor(Number(discountCents) || 0));
  const sub = await orderSubtotal(o.id);
  if (sub <= 0) return { error: "لا يوجد مبلغ أصناف" };
  if (d > sub) return { error: "الخصم لا يتجاوز مجموع الأصناف" };
  await db.update(schema.orders).set({ ownerDiscountCents: d }).where(eq(schema.orders.id, o.id));
  revalidateOrderPaths();
  return { error: null };
}

export async function addOrderItemFromMenu(input: {
  orderId: string;
  menuItemId: string;
  quantity: number;
  priceOptionLabel: string | null;
}): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const o = await ownOrder(input.orderId, rid);
  if (!o) return { error: "الطلب غير موجود" };
  const locked = structureLockReason(o);
  if (locked) return { error: locked };

  const [item] = await db
    .select()
    .from(schema.menuItems)
    .where(and(eq(schema.menuItems.id, input.menuItemId), eq(schema.menuItems.restaurantId, rid)))
    .limit(1);
  if (!item) return { error: "الصنف غير موجود" };
  if (!item.isAvailable) return { error: "الصنف غير متاح حالياً" };
  const price = resolveUnitPriceCents(toMenuItemDto(item), input.priceOptionLabel);
  if (!price.ok) return { error: "اختر حجم السعر للصنف" };
  const quantity = Math.min(99, Math.max(1, Math.floor(Number(input.quantity) || 1)));

  await db.insert(schema.orderItems).values({
    orderId: o.id,
    menuItemId: item.id,
    itemName: item.name,
    priceOptionLabel: input.priceOptionLabel?.trim() || null,
    quantity,
    unitPriceCents: price.cents,
    lineTotalCents: price.cents * quantity,
  });
  await clampOwnerDiscount(o.id);
  revalidateOrderPaths();
  return { error: null };
}

/** بند الطلب + الطلب، بشرط أن يتبع مطعم المستخدم */
async function ownOrderItem(orderItemId: string, restaurantId: string) {
  const [row] = await db
    .select({ item: schema.orderItems, order: schema.orders })
    .from(schema.orderItems)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.orderItems.orderId))
    .where(and(eq(schema.orderItems.id, orderItemId), eq(schema.orders.restaurantId, restaurantId)))
    .limit(1);
  return row ?? null;
}

export async function updateOrderItemQuantity(orderItemId: string, quantity: number): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const row = await ownOrderItem(orderItemId, restaurant_id!);
  if (!row) return { error: "البند غير موجود" };
  const locked = structureLockReason(row.order);
  if (locked) return { error: locked };

  const q = Math.min(99, Math.max(1, Math.floor(Number(quantity) || 1)));
  await db
    .update(schema.orderItems)
    .set({ quantity: q, lineTotalCents: row.item.unitPriceCents * q })
    .where(eq(schema.orderItems.id, orderItemId));
  await clampOwnerDiscount(row.order.id);
  revalidateOrderPaths();
  return { error: null };
}

export async function removeOrderItem(orderItemId: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const row = await ownOrderItem(orderItemId, restaurant_id!);
  if (!row) return { error: "البند غير موجود" };
  const locked = structureLockReason(row.order);
  if (locked) return { error: locked };

  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.orderItems)
    .where(eq(schema.orderItems.orderId, row.order.id));
  if (n <= 1) return { error: "يجب أن يبقى صنف واحد على الأقل في الطلب" };

  await db.delete(schema.orderItems).where(eq(schema.orderItems.id, orderItemId));
  await clampOwnerDiscount(row.order.id);
  revalidateOrderPaths();
  return { error: null };
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  if (!ORDER_STATUSES.includes(status)) return { error: "حالة غير صالحة" };

  const updated = await db
    .update(schema.orders)
    .set({ status })
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.restaurantId, rid)))
    .returning({ id: schema.orders.id });
  if (!updated.length) return { error: "الطلب غير موجود" };

  // الإنفاق والنقاط عند أول اكتمال فقط (الدالة نفسها تتحقق من ذلك)
  if (status === "completed") {
    try {
      await finalizeCompletedOrder(orderId, rid);
    } catch (e) {
      console.error("finalizeCompletedOrder failed", e);
    }
  }

  revalidateOrderPaths();
  revalidatePath("/admin/customers");
  return { error: null };
}

// ---------------------------------------------------------------------------
// تتبع الطلب العام (بدون تسجيل دخول — الرمز السري هو الصلاحية)
// ---------------------------------------------------------------------------

/** بند طلب في صفحة التتبع العامة */
export type PublicOrderTrackingItem = {
  id: string;
  menu_item_name: string;
  quantity: number;
  price_option_label: string | null;
  line_total_cents: number;
  excluded_ingredients?: string[];
};

/** تتبّع عام للزبون — يُستدعى من صفحة التتبع فقط (بدون تسجيل دخول) */
export type PublicOrderTracking = {
  display_number: number;
  status: OrderStatus;
  created_at: string;
  restaurant_name: string;
  logo_url: string | null;
  menu_title_animation_enabled: boolean;
  /** فوتر المنيو العام — نفس ما يظهر في صفحة المنيو */
  footer_note: string | null;
  public_address: string | null;
  public_maps_url: string | null;
  public_phone_1: string | null;
  public_phone_2: string | null;
  public_phone_3: string | null;
  social_facebook_url: string | null;
  social_instagram_url: string | null;
  social_tiktok_url: string | null;
  fulfillment: OrderFulfillment;
  delivery_address: string | null;
  table_label: string | null;
  customer_phone: string;
  items: PublicOrderTrackingItem[];
  /** مجموع بنود الطلب قبل خصم النقاط */
  items_subtotal_cents: number;
  loyalty_points_used: number;
  loyalty_discount_cents: number;
  /** خصم يدوي من المطعم (لا يُعرض للزبون كملاحظات داخلية) */
  owner_discount_cents: number;
  /** نقاط الولاء المكتسبة من هذا الطلب (بعد اكتماله) */
  loyalty_points_earned_on_order: number;
  /** المبلغ المستحق بعد خصم النقاط */
  total_cents: number;
  currency_code: string;
  /** عرض العملة الثانية كما في المنيو عند التفعيل */
  secondary_currency_enabled: boolean;
  secondary_currency_code: string | null;
  secondary_exchange_rate: number | null;
};

export async function getOrderTrackingByToken(subdomain: string, token: string): Promise<PublicOrderTracking | null> {
  const t = token?.trim();
  if (!t || !/^[0-9a-f]{64}$/.test(t) || !subdomain?.trim()) return null;

  const restaurant = await findRestaurantBySubdomain(subdomain);
  if (!restaurant) return null;
  const [order] = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.trackingToken, t), eq(schema.orders.restaurantId, restaurant.id)))
    .limit(1);
  if (!order) return null;

  const [items, [table], [earn]] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)).orderBy(asc(schema.orderItems.itemName)),
    order.tableId
      ? db.select({ label: schema.restaurantTables.label }).from(schema.restaurantTables).where(eq(schema.restaurantTables.id, order.tableId))
      : Promise.resolve([] as { label: string }[]),
    db
      .select({ points: schema.loyaltyTransactions.pointsDelta })
      .from(schema.loyaltyTransactions)
      .where(and(eq(schema.loyaltyTransactions.orderId, order.id), eq(schema.loyaltyTransactions.txType, "earn"))),
  ]);

  const subtotal = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const secOn = restaurant.secondaryCurrencyEnabled;
  const secCode = restaurant.secondaryCurrencyCode?.trim() || null;
  const secRate = restaurant.secondaryCurrencyExchangeRate == null ? NaN : Number(restaurant.secondaryCurrencyExchangeRate);

  return {
    display_number: order.displayNumber,
    status: order.status,
    created_at: order.createdAt.toISOString(),
    restaurant_name: restaurant.name,
    logo_url: restaurant.logoUrl,
    menu_title_animation_enabled: restaurant.menuTitleAnimationEnabled,
    footer_note: restaurant.footerNote,
    public_address: restaurant.publicAddress,
    public_maps_url: restaurant.publicMapsUrl,
    public_phone_1: restaurant.publicPhone1,
    public_phone_2: restaurant.publicPhone2,
    public_phone_3: restaurant.publicPhone3,
    social_facebook_url: restaurant.socialFacebookUrl,
    social_instagram_url: restaurant.socialInstagramUrl,
    social_tiktok_url: restaurant.socialTiktokUrl,
    fulfillment: order.fulfillment,
    delivery_address: order.deliveryAddress,
    table_label: table?.label ?? null,
    customer_phone: order.customerPhone,
    items: items.map((i) => ({
      id: i.id,
      menu_item_name: i.itemName,
      quantity: i.quantity,
      price_option_label: i.priceOptionLabel,
      line_total_cents: i.lineTotalCents,
      excluded_ingredients: i.excludedIngredients.length ? i.excludedIngredients : undefined,
    })),
    items_subtotal_cents: subtotal,
    loyalty_points_used: order.loyaltyPointsUsed,
    loyalty_discount_cents: order.loyaltyDiscountCents,
    owner_discount_cents: order.ownerDiscountCents,
    loyalty_points_earned_on_order: earn?.points ?? 0,
    total_cents: Math.max(0, subtotal - order.loyaltyDiscountCents - order.ownerDiscountCents),
    currency_code: restaurant.currencyCode,
    secondary_currency_enabled: secOn,
    secondary_currency_code: secOn ? secCode : null,
    secondary_exchange_rate: secOn && secCode && Number.isFinite(secRate) && secRate > 0 ? secRate : null,
  };
}

// ---------------------------------------------------------------------------
// جرس الطلبات الجديدة (استعلام دوري بدل Realtime)
// ---------------------------------------------------------------------------

/** أرقام الطلبات الأحدث من sinceNumber (أو آخر رقم فقط عند sinceNumber = null) */
export async function pollNewOrders(
  sinceNumber: number | null
): Promise<{ latest: number; newNumbers: number[] }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const [r] = await db
    .select({ latest: schema.restaurants.lastOrderNumber })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, rid));
  const latest = r?.latest ?? 0;
  if (sinceNumber == null || latest <= sinceNumber) return { latest, newNumbers: [] };

  const rows = await db
    .select({ n: schema.orders.displayNumber })
    .from(schema.orders)
    .where(and(eq(schema.orders.restaurantId, rid), sql`${schema.orders.displayNumber} > ${sinceNumber}`))
    .orderBy(asc(schema.orders.displayNumber))
    .limit(20);
  return { latest, newNumbers: rows.map((x) => x.n) };
}
