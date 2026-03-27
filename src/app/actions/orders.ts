"use server";

import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { getProfileOrRedirect } from "@/app/actions/auth";
import type { MenuItem } from "@/lib/types/database";
import type {
  GuestOrder,
  GuestOrderWithDetails,
  OrderFulfillment,
  OrderStatus,
} from "@/lib/types/database";
import { resolveUnitPriceCents } from "@/lib/order-pricing";
import { normalizeExcludedForDb } from "@/lib/order-exclusions";
import { enqueuePointsBalanceNotification } from "@/lib/notifications";
import {
  mirrorLoyaltyAccountToLegacyPhoneRow,
  syncLoyaltyProfileForPhoneFromLegacy,
} from "@/app/actions/customers";

export async function getRestaurantTableByToken(
  restaurantId: string,
  token: string | null | undefined
): Promise<{ id: string; label: string } | null> {
  if (!token?.trim()) return null;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("restaurant_tables")
      .select("id, label, restaurant_id")
      .eq("restaurant_id", restaurantId)
      .eq("public_token", token.trim())
      .maybeSingle();
    if (error || !data) return null;
    return { id: data.id, label: data.label };
  } catch {
    return null;
  }
}

export async function listPublicTablesForRestaurant(
  restaurantId: string
): Promise<{ id: string; label: string }[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("restaurant_tables")
      .select("id, label")
      .eq("restaurant_id", restaurantId)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });
    if (error || !data) return [];
    return data as { id: string; label: string }[];
  } catch {
    return [];
  }
}

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
export async function getCheckoutLoyaltyPreview(input: {
  subdomain: string;
  customerPhone: string;
}): Promise<
  | {
      ok: true;
      programEnabled: boolean;
      pointsBalance: number;
      pointValueCents: number;
      spendCentsPerPoint: number;
    }
  | { ok: false; error: string }
> {
  const sub = input.subdomain.trim().toLowerCase();
  const phone = normalizePhone(input.customerPhone);
  if (!sub || !phone) {
    return { ok: false, error: "بيانات غير صالحة" };
  }
  try {
    const admin = createAdminClient();
    const { data: restaurant, error: rErr } = await admin
      .from("restaurants")
      .select(
        "id, loyalty_program_enabled, loyalty_spend_cents_per_point, loyalty_point_value_cents"
      )
      .ilike("subdomain", sub)
      .maybeSingle();
    if (rErr || !restaurant) return { ok: false, error: "المطعم غير موجود" };

    const rid = restaurant.id as string;
    await syncLoyaltyProfileForPhoneFromLegacy(rid, phone);
    const programEnabled = restaurant.loyalty_program_enabled === true;
    const spendCentsPerPoint = Math.max(
      1,
      Math.floor(Number(restaurant.loyalty_spend_cents_per_point ?? 100))
    );
    const pointValueCents = Math.max(
      1,
      Math.floor(Number(restaurant.loyalty_point_value_cents ?? 10))
    );

    const { data: leg } = await admin
      .from("restaurant_customer_phones")
      .select("points_balance")
      .eq("restaurant_id", rid)
      .eq("phone_normalized", phone)
      .maybeSingle();
    const legBal = Number((leg as { points_balance: number } | null)?.points_balance ?? 0);

    const { data: cp } = await admin
      .from("customer_profiles")
      .select("id")
      .eq("restaurant_id", rid)
      .eq("phone_normalized", phone)
      .maybeSingle();

    let accBal = 0;
    if (cp) {
      const { data: la } = await admin
        .from("loyalty_accounts")
        .select("points_balance")
        .eq("restaurant_id", rid)
        .eq("customer_id", (cp as { id: string }).id)
        .maybeSingle();
      accBal = Number((la as { points_balance: number } | null)?.points_balance ?? 0);
    }

    const pointsBalance = Math.max(legBal, accBal);

    return {
      ok: true,
      programEnabled,
      pointsBalance,
      pointValueCents,
      spendCentsPerPoint,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر جلب بيانات الولاء";
    return { ok: false, error: msg };
  }
}

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type CreateGuestOrderResult =
  | { ok: true; orderId: string; displayNumber: number; trackingToken: string }
  | { ok: false; error: string };

export async function createGuestOrder(
  input: CreateGuestOrderInput
): Promise<CreateGuestOrderResult> {
  const sub = input.subdomain.trim().toLowerCase();
  if (!sub) return { ok: false, error: "معرّف المطعم غير صالح" };

  const phone = normalizePhone(input.customerPhone);
  if (!phone) return { ok: false, error: "رقم الجوال غير صالح (8–15 رقماً)" };

  if (!input.items.length) return { ok: false, error: "السلة فارغة" };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return {
      ok: false,
      error:
        "إعدادات الخادم غير مكتملة. تأكد من وجود SUPABASE_SERVICE_ROLE_KEY في بيئة التشغيل.",
    };
  }

  try {
  const { data: restaurant, error: rErr } = await admin
    .from("restaurants")
    .select(
      "id, subdomain, status, loyalty_program_enabled, loyalty_spend_cents_per_point, loyalty_point_value_cents"
    )
    .ilike("subdomain", sub)
    .maybeSingle();

  if (rErr || !restaurant) return { ok: false, error: "المطعم غير موجود" };
  if (restaurant.status && restaurant.status !== "active" && restaurant.status !== "trial") {
    return { ok: false, error: "المطعم غير متاح حالياً" };
  }

  const restaurantId = restaurant.id as string;

  let tableId: string | null = null;
  let orderWaiterId: string | null = null;
  if (input.tableToken?.trim()) {
    const { data: t } = await admin
      .from("restaurant_tables")
      .select("id, waiter_id")
      .eq("restaurant_id", restaurantId)
      .eq("public_token", input.tableToken.trim())
      .maybeSingle();
    if (!t) return { ok: false, error: "رابط الطاولة غير صالح" };
    tableId = t.id;
    orderWaiterId = (t as { waiter_id?: string | null }).waiter_id ?? null;
    if (input.fulfillment !== "dine_in") {
      return { ok: false, error: "طلب الطاولة يجب أن يكون للتناول داخل المطعم" };
    }
  } else {
    if (input.fulfillment === "dine_in") {
      if (!input.tableId) return { ok: false, error: "اختر رقم الطاولة" };
      const { data: t } = await admin
        .from("restaurant_tables")
        .select("id, waiter_id")
        .eq("restaurant_id", restaurantId)
        .eq("id", input.tableId)
        .maybeSingle();
      if (!t) return { ok: false, error: "الطاولة غير صالحة" };
      tableId = t.id;
      orderWaiterId = (t as { waiter_id?: string | null }).waiter_id ?? null;
    }
  }

  let deliveryAddress: string | null = null;
  if (input.fulfillment === "delivery") {
    const addr = input.deliveryAddress?.trim();
    if (!addr || addr.length < 5) return { ok: false, error: "عنوان التوصيل مطلوب" };
    deliveryAddress = addr;
  }

  const itemIds = [...new Set(input.items.map((i) => i.menuItemId))];
  const { data: menuRows, error: mErr } = await admin
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .in("id", itemIds);

  if (mErr || !menuRows?.length) return { ok: false, error: "تعذر التحقق من الأصناف" };

  const byId = new Map(menuRows.map((r) => [r.id, r as MenuItem]));
  const lines: {
    menu_item_id: string;
    quantity: number;
    unit_price_cents: number;
    price_option_label: string | null;
    line_total_cents: number;
    excluded_ingredients: string[];
  }[] = [];

  for (const row of input.items) {
    const item = byId.get(row.menuItemId);
    if (!item) return { ok: false, error: "صنف غير موجود" };
    if (item.is_available === false) return { ok: false, error: `غير متاح: ${item.name}` };

    const exNorm = normalizeExcludedForDb(row.excludedIngredients ?? []);
    if (!exNorm.ok) return { ok: false, error: "قائمة المكوّنات المستبعدة غير صالحة" };

    const pr = resolveUnitPriceCents(item, row.priceOptionLabel);
    if (!pr.ok) return { ok: false, error: `اختر حجم السعر لـ ${item.name}` };
    const q = Math.min(99, Math.max(1, Math.floor(row.quantity)));
    const unit = pr.cents;
    lines.push({
      menu_item_id: item.id,
      quantity: q,
      unit_price_cents: unit,
      price_option_label: row.priceOptionLabel?.trim() || null,
      line_total_cents: unit * q,
      excluded_ingredients: exNorm.value,
    });
  }

  const trackingToken = randomBytes(32).toString("hex");
  const { data: displayNumRaw, error: rpcErr } = await admin.rpc("next_order_display_number", {
    p_restaurant_id: restaurantId,
  });
  const displayNumber = Number(displayNumRaw);
  if (rpcErr || displayNumRaw == null || !Number.isFinite(displayNumber) || displayNumber < 1) {
    return {
      ok: false,
      error:
        rpcErr?.message ??
        "تعذر تخصيص رقم الطلب. نفّذ ملف supabase/orders-display-tracking.sql في قاعدة البيانات.",
    };
  }

  const { data: orderRow, error: oErr } = await admin
    .from("orders")
    .insert({
      restaurant_id: restaurantId,
      table_id: tableId,
      waiter_id: orderWaiterId,
      fulfillment: input.fulfillment,
      delivery_address: deliveryAddress,
      customer_phone: phone,
      status: "pending",
      display_number: displayNumber,
      tracking_token: trackingToken,
    })
    .select("id")
    .single();

  if (oErr || !orderRow) return { ok: false, error: oErr?.message ?? "فشل إنشاء الطلب" };

  const orderId = orderRow.id as string;

  const { error: oiErr } = await admin.from("order_items").insert(
    lines.map((l) => ({
      order_id: orderId,
      menu_item_id: l.menu_item_id,
      quantity: l.quantity,
      unit_price_cents: l.unit_price_cents,
      price_option_label: l.price_option_label,
      line_total_cents: l.line_total_cents,
      excluded_ingredients: l.excluded_ingredients.length ? l.excluded_ingredients : [],
    }))
  );

  if (oiErr) {
    await admin.from("orders").delete().eq("id", orderId);
    return { ok: false, error: oiErr.message ?? "فشل حفظ بنود الطلب" };
  }

  const orderTotalCents = lines.reduce((s, l) => s + l.line_total_cents, 0);
  const pointVal = Math.max(1, Math.floor(Number(restaurant.loyalty_point_value_cents ?? 10)));

  await syncLoyaltyProfileForPhoneFromLegacy(restaurantId, phone);

  let loyaltyDiscountCents = 0;
  let loyaltyPointsUsed = 0;
  const requestedRedeem = Math.max(0, Math.floor(Number(input.loyaltyPointsToRedeem ?? 0)));

  if (restaurant.loyalty_program_enabled === true && requestedRedeem > 0 && orderTotalCents > 0) {
    const { data: cup, error: cupErr } = await admin
      .from("customer_profiles")
      .upsert(
        { restaurant_id: restaurantId, phone_normalized: phone },
        { onConflict: "restaurant_id,phone_normalized" }
      )
      .select("id")
      .single();
    if (!cupErr && cup) {
      const redeemCustomerId = (cup as { id: string }).id;
      const { data: accRow } = await admin
        .from("loyalty_accounts")
        .select("points_balance")
        .eq("restaurant_id", restaurantId)
        .eq("customer_id", redeemCustomerId)
        .maybeSingle();
      const balance = Number((accRow as { points_balance: number } | null)?.points_balance ?? 0);
      const maxPointsByOrder = Math.floor(orderTotalCents / pointVal);
      const redeemPts = Math.min(requestedRedeem, balance, maxPointsByOrder);

      if (redeemPts > 0) {
        const redeemRpc = await admin.rpc("redeem_loyalty_cash", {
          p_customer_id: redeemCustomerId,
          p_order_id: orderId,
          p_points_requested: redeemPts,
        });
        if (redeemRpc.error || !Array.isArray(redeemRpc.data) || !redeemRpc.data[0]) {
          await admin.from("order_items").delete().eq("order_id", orderId);
          await admin.from("orders").delete().eq("id", orderId);
          return {
            ok: false,
            error:
              redeemRpc.error?.message ??
              "تعذر تطبيق خصم النقاط. تحقق من رصيدك أو قلّل عدد النقاط.",
          };
        }
        const rr = redeemRpc.data[0] as {
          points_redeemed: number;
          discount_cents: number;
          new_balance: number;
        };
        loyaltyPointsUsed = Number(rr.points_redeemed ?? 0);
        loyaltyDiscountCents = Number(rr.discount_cents ?? 0);

        const { error: updOrdErr } = await admin
          .from("orders")
          .update({
            loyalty_points_used: loyaltyPointsUsed,
            loyalty_discount_cents: loyaltyDiscountCents,
          })
          .eq("id", orderId);
        if (updOrdErr) {
          await admin.from("order_items").delete().eq("order_id", orderId);
          await admin.from("orders").delete().eq("id", orderId);
          return { ok: false, error: updOrdErr.message };
        }
      }
    }
  }

  // الإنفاق وكسب النقاط يُحتسبان عند وضع الطلب «مكتمل» فقط (finalizeLoyaltyOnOrderCompleted)

  const { data: existingPhone } = await admin
    .from("restaurant_customer_phones")
    .select("id, order_count")
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone)
    .maybeSingle();

  if (existingPhone) {
    await admin
      .from("restaurant_customer_phones")
      .update({
        last_order_at: new Date().toISOString(),
        order_count: (existingPhone.order_count as number) + 1,
      })
      .eq("id", existingPhone.id);
  } else {
    await admin.from("restaurant_customer_phones").insert({
      restaurant_id: restaurantId,
      phone_normalized: phone,
      order_count: 1,
      total_spent_cents: 0,
      points_balance: 0,
      lifetime_points_earned: 0,
      lifetime_points_redeemed: 0,
    });
  }

  const { data: cpMirror } = await admin
    .from("customer_profiles")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone)
    .maybeSingle();
  if (cpMirror) {
    await mirrorLoyaltyAccountToLegacyPhoneRow(restaurantId, (cpMirror as { id: string }).id);
  }

  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");

  return { ok: true, orderId, displayNumber, trackingToken };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر إرسال الطلب";
    return { ok: false, error: msg };
  }
}

/** يُستدعى عند أول انتقال إلى «مكتمل»: إضافة الإنفاق إلى ملف الزبون + كسب النقاط (مرة واحدة). */
async function finalizeLoyaltyOnOrderCompleted(orderId: string, restaurantId: string): Promise<void> {
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  const { data: orderRow, error: oErr } = await admin
    .from("orders")
    .select(
      "id, customer_phone, loyalty_discount_cents, owner_discount_cents, status, completion_accounting_done"
    )
    .eq("id", orderId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (oErr || !orderRow) return;
  const row = orderRow as {
    customer_phone: string;
    loyalty_discount_cents: number | null;
    owner_discount_cents?: number | null;
    status: string;
    completion_accounting_done?: boolean | null;
  };
  if (row.status !== "completed") return;
  if (row.completion_accounting_done === true) return;

  const phone = normalizePhone(row.customer_phone);
  if (!phone) return;

  const { data: oiRows } = await admin.from("order_items").select("line_total_cents").eq("order_id", orderId);
  const subtotal = (oiRows ?? []).reduce(
    (s, r) => s + Number((r as { line_total_cents: number }).line_total_cents ?? 0),
    0
  );
  const loyaltyDisc = Math.max(0, Number(row.loyalty_discount_cents ?? 0));
  const ownerDisc = Math.max(0, Number(row.owner_discount_cents ?? 0));
  const payableCents = Math.max(0, subtotal - loyaltyDisc - ownerDisc);

  const { data: existingPhone } = await admin
    .from("restaurant_customer_phones")
    .select("id, total_spent_cents")
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone)
    .maybeSingle();
  if (existingPhone) {
    const prevSpent = Number(existingPhone.total_spent_cents ?? 0);
    await admin
      .from("restaurant_customer_phones")
      .update({
        total_spent_cents: prevSpent + payableCents,
      })
      .eq("id", existingPhone.id);
  } else {
    await admin.from("restaurant_customer_phones").insert({
      restaurant_id: restaurantId,
      phone_normalized: phone,
      order_count: 1,
      total_spent_cents: payableCents,
      points_balance: 0,
      lifetime_points_earned: 0,
      lifetime_points_redeemed: 0,
    });
  }

  const { data: rest } = await admin
    .from("restaurants")
    .select("loyalty_program_enabled")
    .eq("id", restaurantId)
    .maybeSingle();
  const programEnabled = rest?.loyalty_program_enabled === true;

  let pointsEarned = 0;
  let loyaltyCustomerId: string | null = null;
  let newBalance = 0;

  if (programEnabled) {
    const earnRpc = await admin.rpc("apply_loyalty_earn", { p_order_id: orderId });
    if (!earnRpc.error && Array.isArray(earnRpc.data) && earnRpc.data.length > 0) {
      const r = earnRpc.data[0] as {
        points_earned?: number | null;
        customer_id?: string | null;
        new_balance?: number | null;
      };
      pointsEarned = Number(r.points_earned ?? 0);
      loyaltyCustomerId = r.customer_id ?? null;
      newBalance = Number(r.new_balance ?? 0);
    }
    if (pointsEarned !== 0) {
      await admin.from("loyalty_point_ledger").insert({
        restaurant_id: restaurantId,
        phone_normalized: phone,
        order_id: orderId,
        delta_points: pointsEarned,
        reason: "earn_order",
      });
    }
  }

  const { data: cpMirror } = await admin
    .from("customer_profiles")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone)
    .maybeSingle();
  if (cpMirror) {
    await mirrorLoyaltyAccountToLegacyPhoneRow(restaurantId, (cpMirror as { id: string }).id);
  }

  if (pointsEarned !== 0 && loyaltyCustomerId) {
    const rawToken = randomBytes(24).toString("hex");
    const tokenHash = sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();
    await admin.from("customer_public_links").insert({
      restaurant_id: restaurantId,
      customer_id: loyaltyCustomerId,
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
    });
    await enqueuePointsBalanceNotification({
      restaurantId,
      customerId: loyaltyCustomerId,
      pointsBalance: newBalance,
      publicLink: `/loyalty/${rawToken}`,
    });
  }

  const { error: flagErr } = await admin
    .from("orders")
    .update({ completion_accounting_done: true })
    .eq("id", orderId);
  if (flagErr) {
    /* يتطلب عمود completion_accounting_done — supabase/loyalty-earn-on-order-completed.sql */
  }
}

async function fetchLoyaltyBalancesForPhones(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  phones: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const uniq = [...new Set(phones.filter(Boolean))];
  if (!uniq.length) return map;
  const { data: leg } = await admin
    .from("restaurant_customer_phones")
    .select("phone_normalized, points_balance")
    .eq("restaurant_id", restaurantId)
    .in("phone_normalized", uniq);
  const legMap = new Map(
    (leg ?? []).map((r: { phone_normalized: string; points_balance: number | null }) => [
      r.phone_normalized,
      Number(r.points_balance ?? 0),
    ])
  );
  const { data: profs } = await admin
    .from("customer_profiles")
    .select("id, phone_normalized")
    .eq("restaurant_id", restaurantId)
    .in("phone_normalized", uniq);
  const phoneToPid = new Map(
    (profs ?? []).map((p: { id: string; phone_normalized: string }) => [p.phone_normalized, p.id])
  );
  const pidList = [...new Set([...phoneToPid.values()])];
  let accByCustomer = new Map<string, number>();
  if (pidList.length) {
    const { data: accs } = await admin
      .from("loyalty_accounts")
      .select("customer_id, points_balance")
      .eq("restaurant_id", restaurantId)
      .in("customer_id", pidList);
    accByCustomer = new Map(
      (accs ?? []).map((a: { customer_id: string; points_balance: number | null }) => [
        a.customer_id,
        Number(a.points_balance ?? 0),
      ])
    );
  }
  for (const p of uniq) {
    const legBal = legMap.get(p) ?? 0;
    const pid = phoneToPid.get(p);
    const accBal = pid ? accByCustomer.get(pid) ?? 0 : 0;
    map.set(p, Math.max(legBal, accBal));
  }
  return map;
}

/** تطبيق أقصى خصم بالنقاط على طلب من لوحة المالك (استبدال فقط؛ الكسب عند اكتمال الطلب). */
export async function applyOwnerLoyaltyRedeemToOrder(orderId: string): Promise<
  | { ok: true; pointsRedeemed: number; discountCents: number }
  | { ok: false; error: string }
> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "إعدادات الخادم غير مكتملة." };
  }

  const { data: restaurant, error: rErr } = await admin
    .from("restaurants")
    .select("loyalty_program_enabled, loyalty_point_value_cents")
    .eq("id", rid)
    .maybeSingle();
  if (rErr || !restaurant) return { ok: false, error: "المطعم غير موجود" };
  if (restaurant.loyalty_program_enabled !== true) {
    return { ok: false, error: "برنامج الولاء غير مفعّل" };
  }
  const pointVal = Math.max(1, Math.floor(Number(restaurant.loyalty_point_value_cents ?? 10)));

  const { data: orderRow, error: oErr } = await admin
    .from("orders")
    .select(
      "id, restaurant_id, customer_phone, loyalty_points_used, loyalty_discount_cents, owner_discount_cents, status"
    )
    .eq("id", orderId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (oErr || !orderRow) return { ok: false, error: "الطلب غير موجود" };
  if ((orderRow as { status: string }).status === "cancelled") {
    return { ok: false, error: "لا يمكن تطبيق خصم على طلب ملغى" };
  }
  if ((orderRow as { status: string }).status === "completed") {
    return {
      ok: false,
      error: "لا يمكن تطبيق خصم النقاط بعد اكتمال الطلب. طبّق الخصم قبل وضع الطلب كمكتمل.",
    };
  }
  const existingDisc = Number((orderRow as { loyalty_discount_cents?: number }).loyalty_discount_cents ?? 0);
  const existingUsed = Number((orderRow as { loyalty_points_used?: number }).loyalty_points_used ?? 0);
  if (existingDisc > 0 || existingUsed > 0) {
    return { ok: false, error: "تم تطبيق خصم نقاط على هذا الطلب مسبقاً" };
  }

  const phone = normalizePhone((orderRow as { customer_phone: string }).customer_phone);
  if (!phone) return { ok: false, error: "رقم الجوال غير صالح" };

  const { data: oiRows } = await admin.from("order_items").select("line_total_cents").eq("order_id", orderId);
  const subtotal = (oiRows ?? []).reduce(
    (s, r) => s + Number((r as { line_total_cents: number }).line_total_cents ?? 0),
    0
  );
  const ownerDiscPre = Math.max(
    0,
    Math.floor(Number((orderRow as { owner_discount_cents?: number }).owner_discount_cents ?? 0))
  );
  const redeemBase = Math.max(0, subtotal - ownerDiscPre);
  if (redeemBase <= 0) return { ok: false, error: "مبلغ الطلب غير صالح بعد الخصم اليدوي" };

  await syncLoyaltyProfileForPhoneFromLegacy(rid, phone);

  const { data: cup, error: cupErr } = await admin
    .from("customer_profiles")
    .upsert(
      { restaurant_id: rid, phone_normalized: phone },
      { onConflict: "restaurant_id,phone_normalized" }
    )
    .select("id")
    .single();
  if (cupErr || !cup) return { ok: false, error: "تعذر تجهيز ملف الزبون" };
  const customerId = (cup as { id: string }).id;

  const { data: accRow } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("restaurant_id", rid)
    .eq("customer_id", customerId)
    .maybeSingle();
  const balance = Number((accRow as { points_balance: number } | null)?.points_balance ?? 0);

  const maxPointsByOrder = Math.floor(redeemBase / pointVal);
  const redeemPts = Math.min(balance, maxPointsByOrder);
  if (redeemPts <= 0) {
    return { ok: false, error: "لا يوجد رصيد نقاط كافٍ أو مبلغ الطلب لا يسمح بالاستبدال" };
  }

  const redeemRpc = await admin.rpc("redeem_loyalty_cash", {
    p_customer_id: customerId,
    p_order_id: orderId,
    p_points_requested: redeemPts,
  });
  if (redeemRpc.error || !Array.isArray(redeemRpc.data) || !redeemRpc.data[0]) {
    return {
      ok: false,
      error: redeemRpc.error?.message ?? "فشل استبدال النقاط",
    };
  }
  const rr = redeemRpc.data[0] as {
    points_redeemed: number;
    discount_cents: number;
    new_balance: number;
  };
  const loyaltyPointsUsed = Number(rr.points_redeemed ?? 0);
  const loyaltyDiscountCents = Number(rr.discount_cents ?? 0);

  const { error: updOrdErr } = await admin
    .from("orders")
    .update({
      loyalty_points_used: loyaltyPointsUsed,
      loyalty_discount_cents: loyaltyDiscountCents,
    })
    .eq("id", orderId);
  if (updOrdErr) {
    return { ok: false, error: updOrdErr.message };
  }

  await mirrorLoyaltyAccountToLegacyPhoneRow(rid, customerId);

  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/owner/customers");
  revalidatePath("/admin/customers");

  return { ok: true, pointsRedeemed: loyaltyPointsUsed, discountCents: loyaltyDiscountCents };
}

export async function listRestaurantOrders(options?: {
  status?: OrderStatus;
  limit?: number;
}): Promise<{ orders: GuestOrderWithDetails[]; error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const limit = Math.min(100, Math.max(1, options?.limit ?? 50));

  let q = supabase
    .from("orders")
    .select("*")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status) {
    q = q.eq("status", options.status);
  }

  const { data: orders, error } = await q;
  if (error) return { orders: [], error: error.message };

  const orderRows = (orders ?? []) as GuestOrder[];
  const ids = orderRows.map((o) => o.id);
  if (!ids.length) return { orders: [], error: null };

  const tableIds = [...new Set(orderRows.map((o) => o.table_id).filter(Boolean))] as string[];
  let tableLabels = new Map<string, string>();
  let tableWaiterIds = new Map<string, string | null>();
  if (tableIds.length) {
    const { data: trows } = await supabase
      .from("restaurant_tables")
      .select("id, label, waiter_id")
      .in("id", tableIds);
    for (const t of trows ?? []) {
      const row = t as { id: string; label: string; waiter_id: string | null };
      tableLabels.set(row.id, row.label);
      tableWaiterIds.set(row.id, row.waiter_id ?? null);
    }
  }

  const waiterIdsToLabel = new Set<string>();
  for (const o of orderRows) {
    const gw = o as GuestOrder;
    if (gw.waiter_id) waiterIdsToLabel.add(gw.waiter_id);
    else if (o.table_id) {
      const tid = tableWaiterIds.get(o.table_id);
      if (tid) waiterIdsToLabel.add(tid);
    }
  }

  let waiterNames = new Map<string, string>();
  if (waiterIdsToLabel.size) {
    const { data: wrows } = await supabase
      .from("restaurant_waiters")
      .select("id, name")
      .in("id", [...waiterIdsToLabel]);
    waiterNames = new Map(
      (wrows ?? []).map((w) => {
        const row = w as { id: string; name: string };
        return [row.id, row.name] as const;
      })
    );
  }

  const { data: items, error: iErr } = await supabase
    .from("order_items")
    .select("*")
    .in("order_id", ids);

  if (iErr) return { orders: [], error: iErr.message };

  const menuIds = [...new Set((items ?? []).map((r) => (r as { menu_item_id: string }).menu_item_id))];
  const { data: menuRows } = await supabase
    .from("menu_items")
    .select("id, name")
    .in("id", menuIds);
  const nameById = new Map((menuRows ?? []).map((m) => [(m as { id: string }).id, (m as { name: string }).name]));

  const { data: earnLedger } = await supabase
    .from("loyalty_point_ledger")
    .select("order_id, delta_points")
    .in("order_id", ids)
    .eq("reason", "earn_order");

  const pointsEarnedByOrder = new Map<string, number>();
  for (const row of earnLedger ?? []) {
    const oid = (row as { order_id: string | null }).order_id;
    if (!oid) continue;
    const d = Number((row as { delta_points: number }).delta_points ?? 0);
    pointsEarnedByOrder.set(oid, (pointsEarnedByOrder.get(oid) ?? 0) + d);
  }

  const itemsByOrder = new Map<string, GuestOrderWithDetails["items"]>();
  for (const row of items ?? []) {
    const r = row as {
      order_id: string;
      id: string;
      menu_item_id: string;
      quantity: number;
      unit_price_cents: number;
      price_option_label: string | null;
      line_total_cents: number;
      excluded_ingredients?: unknown;
    };
    let excluded: string[] = [];
    if (Array.isArray(r.excluded_ingredients)) {
      excluded = r.excluded_ingredients.filter((x): x is string => typeof x === "string");
    }
    const list = itemsByOrder.get(r.order_id) ?? [];
    list.push({
      id: r.id,
      order_id: r.order_id,
      menu_item_id: r.menu_item_id,
      quantity: r.quantity,
      unit_price_cents: r.unit_price_cents,
      price_option_label: r.price_option_label,
      line_total_cents: r.line_total_cents,
      excluded_ingredients: excluded.length ? excluded : undefined,
      menu_item_name: nameById.get(r.menu_item_id) ?? undefined,
    });
    itemsByOrder.set(r.order_id, list);
  }

  let balanceMap = new Map<string, number>();
  let loyaltyProgramEnabled = false;
  let pointValueCents = 10;
  try {
    const admin = createAdminClient();
    const { data: restRow } = await admin
      .from("restaurants")
      .select("loyalty_program_enabled, loyalty_point_value_cents")
      .eq("id", rid)
      .maybeSingle();
    loyaltyProgramEnabled = restRow?.loyalty_program_enabled === true;
    pointValueCents = Math.max(1, Math.floor(Number(restRow?.loyalty_point_value_cents ?? 10)));
    const phones = orderRows.map((row) => String(row.customer_phone ?? ""));
    balanceMap = await fetchLoyaltyBalancesForPhones(admin, rid, phones);
  } catch {
    /* تجاهل — تعرض القائمة بدون أرصدة */
  }

  const result: GuestOrderWithDetails[] = orderRows.map((o) => {
    const g = o as GuestOrder;
    const lineItems = itemsByOrder.get(o.id) ?? [];
    const subtotal = lineItems.reduce((s, i) => s + i.line_total_cents, 0);
    const ownerDiscPre = Math.max(0, Number((g as GuestOrder).owner_discount_cents ?? 0));
    const redeemBase = Math.max(0, subtotal - ownerDiscPre);
    const phone = String(o.customer_phone ?? "");
    const balance = balanceMap.get(phone) ?? 0;
    const pv = pointValueCents;
    const maxPts =
      loyaltyProgramEnabled && redeemBase > 0
        ? Math.min(balance, Math.floor(redeemBase / pv))
        : 0;
    const loyaltyDisc = Number(g.loyalty_discount_cents ?? 0);
    const loyaltyUsed = Number(g.loyalty_points_used ?? 0);
    const ownerCan =
      loyaltyProgramEnabled &&
      loyaltyDisc === 0 &&
      loyaltyUsed === 0 &&
      maxPts > 0 &&
      o.status !== "cancelled" &&
      o.status !== "completed";

    const twid =
      g.waiter_id ?? (o.table_id ? tableWaiterIds.get(o.table_id) ?? null : null);
    const wname = twid ? waiterNames.get(twid) ?? null : null;

    return {
      id: o.id,
      restaurant_id: o.restaurant_id,
      table_id: o.table_id,
      waiter_id: g.waiter_id ?? null,
      fulfillment: o.fulfillment,
      delivery_address: o.delivery_address,
      customer_phone: o.customer_phone,
      status: o.status,
      display_number: g.display_number,
      tracking_token: g.tracking_token,
      created_at: o.created_at,
      loyalty_points_used: Number(g.loyalty_points_used ?? 0),
      loyalty_discount_cents: Number(g.loyalty_discount_cents ?? 0),
      staff_notes: (g as GuestOrder).staff_notes ?? null,
      owner_discount_cents: ownerDiscPre,
      loyalty_points_earned_on_order: pointsEarnedByOrder.get(o.id) ?? 0,
      table_label: o.table_id ? tableLabels.get(o.table_id) ?? null : null,
      table_waiter_id: twid,
      waiter_name: wname,
      items: lineItems,
      customer_loyalty_points_balance: balance,
      owner_can_apply_loyalty_redeem: ownerCan,
      owner_redeem_max_points: ownerCan ? maxPts : 0,
      owner_redeem_max_discount_cents: ownerCan ? maxPts * pv : 0,
    };
  });

  return { orders: result, error: null };
}

/** تعيين أو إلغاء تعيين الويتر على الطلب يدوياً (يُخزَّن في orders.waiter_id) */
export async function updateOrderWaiter(
  orderId: string,
  waiterId: string | null
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();

  if (waiterId) {
    const { data: w } = await supabase
      .from("restaurant_waiters")
      .select("id")
      .eq("id", waiterId)
      .eq("restaurant_id", rid)
      .maybeSingle();
    if (!w) return { error: "الويتر غير موجود" };
  }

  const { error } = await supabase
    .from("orders")
    .update({ waiter_id: waiterId })
    .eq("id", orderId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };

  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
  return { error: null };
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

async function assertOrderEditableForStructure(
  supabase: SupabaseServer,
  orderId: string,
  rid: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: o } = await supabase
    .from("orders")
    .select("status, loyalty_points_used, loyalty_discount_cents")
    .eq("id", orderId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (!o) return { ok: false, error: "الطلب غير موجود" };
  const st = (o as { status: string }).status;
  if (st === "completed" || st === "cancelled") {
    return { ok: false, error: "لا يمكن تعديل طلب مكتمل أو ملغى" };
  }
  const lu = Number((o as { loyalty_points_used?: number }).loyalty_points_used ?? 0);
  const ld = Number((o as { loyalty_discount_cents?: number }).loyalty_discount_cents ?? 0);
  if (lu > 0 || ld > 0) {
    return {
      ok: false,
      error: "لا يمكن تعديل الأصناف أو الخصم اليدوي بعد تطبيق خصم النقاط.",
    };
  }
  return { ok: true };
}

async function orderSubtotalCents(supabase: SupabaseServer, orderId: string): Promise<number> {
  const { data: rows } = await supabase
    .from("order_items")
    .select("line_total_cents")
    .eq("order_id", orderId);
  return (rows ?? []).reduce(
    (s, r) => s + Number((r as { line_total_cents: number }).line_total_cents ?? 0),
    0
  );
}

async function clampOwnerDiscountToSubtotal(
  supabase: SupabaseServer,
  orderId: string,
  rid: string
): Promise<void> {
  const { data: o } = await supabase
    .from("orders")
    .select("owner_discount_cents")
    .eq("id", orderId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  const od = Math.max(0, Number((o as { owner_discount_cents?: number })?.owner_discount_cents ?? 0));
  const sub = await orderSubtotalCents(supabase, orderId);
  if (od > sub) {
    await supabase
      .from("orders")
      .update({ owner_discount_cents: sub })
      .eq("id", orderId)
      .eq("restaurant_id", rid);
  }
}

function revalidateOrderPaths() {
  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
}

/** ملاحظات داخلية للطاقم — مسموح حتى للطلبات المكتملة ما عدا الملغاة */
export async function updateOrderStaffNotes(
  orderId: string,
  notes: string | null
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { data: o } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (!o) return { error: "الطلب غير موجود" };
  if ((o as { status: string }).status === "cancelled") {
    return { error: "لا يمكن تعديل طلب ملغى" };
  }
  const trimmed = notes?.trim() ?? "";
  const { error } = await supabase
    .from("orders")
    .update({ staff_notes: trimmed || null })
    .eq("id", orderId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidateOrderPaths();
  return { error: null };
}

export async function setOrderOwnerDiscount(
  orderId: string,
  discountCents: number
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const gate = await assertOrderEditableForStructure(supabase, orderId, rid);
  if (!gate.ok) return { error: gate.error };
  const d = Math.max(0, Math.floor(Number(discountCents)));
  const sub = await orderSubtotalCents(supabase, orderId);
  if (sub <= 0) return { error: "لا يوجد مبلغ أصناف" };
  if (d > sub) return { error: "الخصم لا يتجاوز مجموع الأصناف" };
  const { error } = await supabase
    .from("orders")
    .update({ owner_discount_cents: d })
    .eq("id", orderId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidateOrderPaths();
  return { error: null };
}

export async function addOrderItemFromMenu(input: {
  orderId: string;
  menuItemId: string;
  quantity: number;
  priceOptionLabel: string | null;
}): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const gate = await assertOrderEditableForStructure(supabase, input.orderId, rid);
  if (!gate.ok) return { error: gate.error };

  const { data: mi } = await supabase
    .from("menu_items")
    .select("*")
    .eq("id", input.menuItemId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (!mi) return { error: "الصنف غير موجود" };
  const item = mi as MenuItem;
  if (item.is_available === false) return { error: "الصنف غير متاح حالياً" };

  const pr = resolveUnitPriceCents(item, input.priceOptionLabel);
  if (!pr.ok) return { error: "اختر حجم السعر للصنف" };
  const q = Math.min(99, Math.max(1, Math.floor(input.quantity)));
  const unit = pr.cents;

  const { error } = await supabase.from("order_items").insert({
    order_id: input.orderId,
    menu_item_id: item.id,
    quantity: q,
    unit_price_cents: unit,
    price_option_label: input.priceOptionLabel?.trim() || null,
    line_total_cents: unit * q,
    excluded_ingredients: [],
  });
  if (error) return { error: error.message };
  await clampOwnerDiscountToSubtotal(supabase, input.orderId, rid);
  revalidateOrderPaths();
  return { error: null };
}

export async function updateOrderItemQuantity(
  orderItemId: string,
  quantity: number
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("order_items")
    .select("id, order_id, unit_price_cents")
    .eq("id", orderItemId)
    .maybeSingle();
  if (!row) return { error: "البند غير موجود" };
  const orderId = (row as { order_id: string }).order_id;

  const gate = await assertOrderEditableForStructure(supabase, orderId, rid);
  if (!gate.ok) return { error: gate.error };

  const q = Math.min(99, Math.max(1, Math.floor(quantity)));
  const unit = Math.max(1, Math.floor(Number((row as { unit_price_cents: number }).unit_price_cents ?? 0)));
  const { error } = await supabase
    .from("order_items")
    .update({
      quantity: q,
      line_total_cents: unit * q,
    })
    .eq("id", orderItemId);
  if (error) return { error: error.message };
  await clampOwnerDiscountToSubtotal(supabase, orderId, rid);
  revalidateOrderPaths();
  return { error: null };
}

export async function removeOrderItem(orderItemId: string): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("order_items")
    .select("id, order_id")
    .eq("id", orderItemId)
    .maybeSingle();
  if (!row) return { error: "البند غير موجود" };
  const orderId = (row as { order_id: string }).order_id;

  const gate = await assertOrderEditableForStructure(supabase, orderId, rid);
  if (!gate.ok) return { error: gate.error };

  const { count } = await supabase
    .from("order_items")
    .select("id", { count: "exact", head: true })
    .eq("order_id", orderId);
  if ((count ?? 0) <= 1) {
    return { error: "يجب أن يبقى صنف واحد على الأقل في الطلب" };
  }

  const { error } = await supabase.from("order_items").delete().eq("id", orderItemId);
  if (error) return { error: error.message };
  await clampOwnerDiscountToSubtotal(supabase, orderId, rid);
  revalidateOrderPaths();
  return { error: null };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { data: prevRow } = await supabase
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  const oldStatus = prevRow?.status as OrderStatus | undefined;

  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };

  if (status === "completed" && oldStatus !== "completed") {
    try {
      await finalizeLoyaltyOnOrderCompleted(orderId, rid);
    } catch {
      /* تجاهل — لا يُعاد فشل تحديث الحالة */
    }
  }

  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
  return { error: null };
}

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

export async function getOrderTrackingByToken(
  subdomain: string,
  token: string
): Promise<PublicOrderTracking | null> {
  const t = token.trim();
  const sub = subdomain.trim().toLowerCase();
  if (!t || !sub) return null;
  try {
    const admin = createAdminClient();
    const { data: restaurant, error: rErr } = await admin
      .from("restaurants")
      .select(
        "id, name, logo_url, menu_title_animation_enabled, footer_note, public_address, public_maps_url, public_phone_1, public_phone_2, public_phone_3, social_facebook_url, social_instagram_url, social_tiktok_url, currency_code, secondary_currency_enabled, secondary_currency_code, secondary_currency_exchange_rate"
      )
      .ilike("subdomain", sub)
      .maybeSingle();
    if (rErr || !restaurant) return null;
    const { data: order, error: oErr } = await admin
      .from("orders")
      .select(
        "id, display_number, status, created_at, restaurant_id, fulfillment, delivery_address, table_id, customer_phone, loyalty_points_used, loyalty_discount_cents, owner_discount_cents"
      )
      .eq("tracking_token", t)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (oErr || !order) return null;

    const orderId = order.id as string;
    let table_label: string | null = null;
    const tid = order.table_id as string | null;
    if (tid) {
      const { data: trow } = await admin
        .from("restaurant_tables")
        .select("label")
        .eq("id", tid)
        .maybeSingle();
      table_label = (trow?.label as string) ?? null;
    }

    const { data: rawItems } = await admin
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    const orderItemsRows = rawItems ?? [];
    const menuIds = [
      ...new Set(
        orderItemsRows.map((r) => (r as { menu_item_id: string }).menu_item_id)
      ),
    ];
    const { data: menuRows } = await admin
      .from("menu_items")
      .select("id, name")
      .in("id", menuIds);
    const nameById = new Map(
      (menuRows ?? []).map((m) => [(m as { id: string }).id, (m as { name: string }).name])
    );

    const items: PublicOrderTrackingItem[] = [];
    let items_subtotal_cents = 0;
    for (const row of orderItemsRows) {
      const r = row as {
        id: string;
        menu_item_id: string;
        quantity: number;
        price_option_label: string | null;
        line_total_cents: number;
        excluded_ingredients?: unknown;
      };
      let excluded: string[] = [];
      if (Array.isArray(r.excluded_ingredients)) {
        excluded = r.excluded_ingredients.filter((x): x is string => typeof x === "string");
      }
      items_subtotal_cents += r.line_total_cents;
      items.push({
        id: r.id,
        menu_item_name: nameById.get(r.menu_item_id) ?? "صنف",
        quantity: r.quantity,
        price_option_label: r.price_option_label,
        line_total_cents: r.line_total_cents,
        excluded_ingredients: excluded.length ? excluded : undefined,
      });
    }

    const currencyCode =
      (restaurant.currency_code as string | null)?.trim() || "SAR";

    const loyaltyDiscount = Math.max(
      0,
      Math.floor(Number((order as { loyalty_discount_cents?: number }).loyalty_discount_cents ?? 0))
    );
    const ownerDiscount = Math.max(
      0,
      Math.floor(Number((order as { owner_discount_cents?: number }).owner_discount_cents ?? 0))
    );
    const loyaltyPointsUsed = Math.max(
      0,
      Math.floor(Number((order as { loyalty_points_used?: number }).loyalty_points_used ?? 0))
    );
    const total_cents = Math.max(0, items_subtotal_cents - loyaltyDiscount - ownerDiscount);

    const { data: earnLedgerRows } = await admin
      .from("loyalty_point_ledger")
      .select("delta_points")
      .eq("order_id", orderId)
      .eq("reason", "earn_order");
    const loyaltyPointsEarnedOnOrder = (earnLedgerRows ?? []).reduce(
      (s, r) => s + Math.floor(Number((r as { delta_points: number }).delta_points ?? 0)),
      0
    );

    const secEnabled = restaurant.secondary_currency_enabled === true;
    const secCode = (restaurant.secondary_currency_code as string | null)?.trim() ?? null;
    const secRateRaw = restaurant.secondary_currency_exchange_rate;
    const secRate =
      secEnabled && secRateRaw != null ? Number(secRateRaw) : NaN;

    return {
      display_number: Number(order.display_number),
      status: order.status as OrderStatus,
      created_at: order.created_at as string,
      restaurant_name: (restaurant.name as string) ?? "",
      logo_url: (restaurant.logo_url as string | null) ?? null,
      menu_title_animation_enabled:
        restaurant.menu_title_animation_enabled === true,
      footer_note: (restaurant.footer_note as string | null) ?? null,
      public_address: (restaurant.public_address as string | null) ?? null,
      public_maps_url: (restaurant.public_maps_url as string | null) ?? null,
      public_phone_1: (restaurant.public_phone_1 as string | null) ?? null,
      public_phone_2: (restaurant.public_phone_2 as string | null) ?? null,
      public_phone_3: (restaurant.public_phone_3 as string | null) ?? null,
      social_facebook_url: (restaurant.social_facebook_url as string | null) ?? null,
      social_instagram_url: (restaurant.social_instagram_url as string | null) ?? null,
      social_tiktok_url: (restaurant.social_tiktok_url as string | null) ?? null,
      fulfillment: order.fulfillment as OrderFulfillment,
      delivery_address: (order.delivery_address as string | null) ?? null,
      table_label,
      customer_phone: (order.customer_phone as string) ?? "",
      items,
      items_subtotal_cents,
      loyalty_points_used: loyaltyPointsUsed,
      loyalty_discount_cents: loyaltyDiscount,
      owner_discount_cents: ownerDiscount,
      loyalty_points_earned_on_order: loyaltyPointsEarnedOnOrder,
      total_cents,
      currency_code: currencyCode,
      secondary_currency_enabled: secEnabled,
      secondary_currency_code: secEnabled ? secCode : null,
      secondary_exchange_rate:
        secEnabled && secCode && Number.isFinite(secRate) && secRate > 0 ? secRate : null,
    };
  } catch {
    return null;
  }
}
