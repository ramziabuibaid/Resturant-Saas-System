"use server";

import { randomBytes } from "crypto";
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
import { pointsEarnedForOrder } from "@/lib/loyalty";
import { normalizeExcludedForDb } from "@/lib/order-exclusions";

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
};

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
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
  if (input.tableToken?.trim()) {
    const { data: t } = await admin
      .from("restaurant_tables")
      .select("id")
      .eq("restaurant_id", restaurantId)
      .eq("public_token", input.tableToken.trim())
      .maybeSingle();
    if (!t) return { ok: false, error: "رابط الطاولة غير صالح" };
    tableId = t.id;
    if (input.fulfillment !== "dine_in") {
      return { ok: false, error: "طلب الطاولة يجب أن يكون للتناول داخل المطعم" };
    }
  } else {
    if (input.fulfillment === "dine_in") {
      if (!input.tableId) return { ok: false, error: "اختر رقم الطاولة" };
      const { data: t } = await admin
        .from("restaurant_tables")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("id", input.tableId)
        .maybeSingle();
      if (!t) return { ok: false, error: "الطاولة غير صالحة" };
      tableId = t.id;
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
  const spendPer =
    restaurant.loyalty_spend_cents_per_point != null
      ? Number(restaurant.loyalty_spend_cents_per_point)
      : 100;
  const pointsEarned = pointsEarnedForOrder(orderTotalCents, {
    loyaltyProgramEnabled: restaurant.loyalty_program_enabled === true,
    spendCentsPerPoint: spendPer,
  });

  const { data: existingPhone } = await admin
    .from("restaurant_customer_phones")
    .select("id, order_count, total_spent_cents, points_balance, lifetime_points_earned")
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone)
    .maybeSingle();

  if (existingPhone) {
    const prevSpent = Number(existingPhone.total_spent_cents ?? 0);
    const prevBalance = Number(existingPhone.points_balance ?? 0);
    const prevLife = Number(existingPhone.lifetime_points_earned ?? 0);
    await admin
      .from("restaurant_customer_phones")
      .update({
        last_order_at: new Date().toISOString(),
        order_count: (existingPhone.order_count as number) + 1,
        total_spent_cents: prevSpent + orderTotalCents,
        points_balance: prevBalance + pointsEarned,
        lifetime_points_earned: prevLife + pointsEarned,
      })
      .eq("id", existingPhone.id);
  } else {
    await admin.from("restaurant_customer_phones").insert({
      restaurant_id: restaurantId,
      phone_normalized: phone,
      order_count: 1,
      total_spent_cents: orderTotalCents,
      points_balance: pointsEarned,
      lifetime_points_earned: pointsEarned,
      lifetime_points_redeemed: 0,
    });
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

  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");

  return { ok: true, orderId, displayNumber, trackingToken };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر إرسال الطلب";
    return { ok: false, error: msg };
  }
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
  if (tableIds.length) {
    const { data: trows } = await supabase
      .from("restaurant_tables")
      .select("id, label")
      .in("id", tableIds);
    tableLabels = new Map((trows ?? []).map((t: { id: string; label: string }) => [t.id, t.label]));
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

  const result: GuestOrderWithDetails[] = orderRows.map((o) => ({
    id: o.id,
    restaurant_id: o.restaurant_id,
    table_id: o.table_id,
    fulfillment: o.fulfillment,
    delivery_address: o.delivery_address,
    customer_phone: o.customer_phone,
    status: o.status,
    display_number: (o as GuestOrder).display_number,
    tracking_token: (o as GuestOrder).tracking_token,
    created_at: o.created_at,
    table_label: o.table_id ? tableLabels.get(o.table_id) ?? null : null,
    items: itemsByOrder.get(o.id) ?? [],
  }));

  return { orders: result, error: null };
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
  return { error: null };
}

/** تتبّع عام للزبون — يُستدعى من صفحة التتبع فقط (بدون تسجيل دخول) */
export type PublicOrderTracking = {
  display_number: number;
  status: OrderStatus;
  created_at: string;
  restaurant_name: string;
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
      .select("id, name")
      .ilike("subdomain", sub)
      .maybeSingle();
    if (rErr || !restaurant) return null;
    const { data: order, error: oErr } = await admin
      .from("orders")
      .select("display_number, status, created_at, restaurant_id")
      .eq("tracking_token", t)
      .eq("restaurant_id", restaurant.id)
      .maybeSingle();
    if (oErr || !order) return null;
    return {
      display_number: Number(order.display_number),
      status: order.status as OrderStatus,
      created_at: order.created_at as string,
      restaurant_name: (restaurant.name as string) ?? "",
    };
  } catch {
    return null;
  }
}
