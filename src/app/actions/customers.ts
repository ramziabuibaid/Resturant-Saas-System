"use server";

import { and, asc, count, desc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import {
  createCustomerPublicLink,
  LoyaltyError,
  redeemCashInTx,
  redeemReward,
} from "@/lib/loyalty/core";
import { enqueuePointsBalanceNotification, renderPointsBalanceSmsTemplate } from "@/lib/notifications";
import type { RestaurantCustomerPhone } from "@/lib/types/database";

/* زبائن المطعم والولاء — كل الدوال مقيّدة بمطعم المستخدم الحالي. */

function revalidateCustomers() {
  revalidatePath("/admin/customers");
}

async function ownCustomer(customerId: string, restaurantId: string) {
  const [c] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.id, customerId), eq(schema.customers.restaurantId, restaurantId)))
    .limit(1);
  return c ?? null;
}

async function publicSiteBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "";
}

export async function listRestaurantCustomers(): Promise<{
  customers: RestaurantCustomerPhone[];
  error: string | null;
  /** للتوافق مع الواجهة القديمة — دائماً false الآن */
  loyaltyColumnsMissing: boolean;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rows = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.restaurantId, restaurant_id!))
    .orderBy(desc(schema.customers.totalSpentCents), desc(schema.customers.lastOrderAt));
  return {
    customers: rows.map((c) => ({
      id: c.id,
      restaurant_id: c.restaurantId,
      phone_normalized: c.phoneNormalized,
      first_seen_at: c.firstSeenAt.toISOString(),
      last_order_at: c.lastOrderAt?.toISOString(),
      order_count: c.orderCount,
      total_spent_cents: c.totalSpentCents,
      points_balance: c.pointsBalance,
      lifetime_points_earned: c.lifetimeEarned,
      lifetime_points_redeemed: c.lifetimeRedeemed,
    })),
    error: null,
    loyaltyColumnsMissing: false,
  };
}

export type LoyaltyDashboardCustomer = {
  customer_id: string;
  phone_normalized: string;
  name: string | null;
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  tx_count: number;
  updated_at: string;
};

export async function listLoyaltyDashboardCustomers(): Promise<{
  customers: LoyaltyDashboardCustomer[];
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const rows = await db
    .select()
    .from(schema.customers)
    .where(eq(schema.customers.restaurantId, rid))
    .orderBy(desc(schema.customers.pointsBalance));
  if (!rows.length) return { customers: [], error: null };

  const txCounts = await db
    .select({ customerId: schema.loyaltyTransactions.customerId, n: count() })
    .from(schema.loyaltyTransactions)
    .where(
      and(
        eq(schema.loyaltyTransactions.restaurantId, rid),
        inArray(
          schema.loyaltyTransactions.customerId,
          rows.map((r) => r.id)
        )
      )
    )
    .groupBy(schema.loyaltyTransactions.customerId);
  const txByCustomer = new Map(txCounts.map((t) => [t.customerId, t.n]));

  return {
    customers: rows.map((c) => ({
      customer_id: c.id,
      phone_normalized: c.phoneNormalized,
      name: c.name,
      points_balance: c.pointsBalance,
      lifetime_earned: c.lifetimeEarned,
      lifetime_redeemed: c.lifetimeRedeemed,
      tx_count: txByCustomer.get(c.id) ?? 0,
      updated_at: c.updatedAt.toISOString(),
    })),
    error: null,
  };
}

export async function generateCustomerMagicLink(customerId: string): Promise<{
  /** رابط مطلق للنسخ أو الإرسال */
  url: string | null;
  /** مسار نسبي */
  path: string | null;
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  if (!(await ownCustomer(customerId, rid))) return { url: null, path: null, error: "العميل غير موجود" };

  const path = await createCustomerPublicLink(db, rid, customerId);
  const base = await publicSiteBaseUrl();
  return { url: base ? `${base}${path}` : path, path, error: null };
}

/** إدراج إشعار برصيد النقاط مع رابط عام (للطابور ثم الإرسال عبر المعالج أو مزود خارجي). */
export async function enqueueCustomerPointsNotification(customerId: string): Promise<{
  queued: boolean;
  previewMessage: string;
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const customer = await ownCustomer(customerId, rid);
  if (!customer) return { queued: false, previewMessage: "", error: "العميل غير موجود" };

  const link = await generateCustomerMagicLink(customerId);
  if (link.error || !link.url) return { queued: false, previewMessage: "", error: link.error ?? "تعذر إنشاء الرابط" };

  await enqueuePointsBalanceNotification({
    restaurantId: rid,
    customerId,
    customerName: customer.name,
    pointsBalance: customer.pointsBalance,
    publicLink: link.url,
  });
  revalidateCustomers();
  return {
    queued: true,
    previewMessage: renderPointsBalanceSmsTemplate({
      customerName: customer.name,
      pointsBalance: customer.pointsBalance,
      publicLink: link.url,
    }),
    error: null,
  };
}

export async function redeemCustomerCashPoints(
  customerId: string,
  pointsRequested: number,
  orderId?: string | null
): Promise<{ pointsRedeemed: number; discountCents: number; newBalance: number; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const fail = (error: string) => ({ pointsRedeemed: 0, discountCents: 0, newBalance: 0, error });

  const points = Math.floor(Number(pointsRequested) || 0);
  if (points < 1) return fail("عدد النقاط غير صالح");
  if (!(await ownCustomer(customerId, rid))) return fail("العميل غير موجود");

  const oid = orderId?.trim() || null;
  if (oid) {
    const [o] = await db
      .select({ id: schema.orders.id })
      .from(schema.orders)
      .where(and(eq(schema.orders.id, oid), eq(schema.orders.restaurantId, rid)))
      .limit(1);
    if (!o) return fail("الطلب غير موجود");
  }

  const [r] = await db
    .select({ pointValue: schema.restaurants.loyaltyPointValueCents })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, rid));

  const result = await db.transaction((tx) =>
    redeemCashInTx(tx, {
      restaurantId: rid,
      customerId,
      orderId: oid,
      pointsRequested: points,
      pointValueCents: Math.max(1, r?.pointValue ?? 10),
    })
  );
  // إن كان الرصيد أقل من المطلوب يُستبدل المتاح فقط، ويظهر العدد الفعلي في النتيجة
  if (result.points === 0) return fail("رصيد النقاط غير كافٍ");

  revalidateCustomers();
  return {
    pointsRedeemed: result.points,
    discountCents: result.discountCents,
    newBalance: result.newBalance,
    error: null,
  };
}

export async function redeemCustomerReward(
  customerId: string,
  rewardId: string,
  orderId?: string
): Promise<{ pointsSpent: number; newBalance: number; redemptionId: string | null; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  try {
    const r = await redeemReward({ restaurantId: rid, customerId, rewardId, orderId: orderId?.trim() || null });
    revalidateCustomers();
    return { ...r, error: null };
  } catch (e) {
    if (e instanceof LoyaltyError) return { pointsSpent: 0, newBalance: 0, redemptionId: null, error: e.message };
    throw e;
  }
}

export async function listRestaurantRewards(): Promise<{
  rewards: {
    id: string;
    title: string;
    description: string | null;
    points_cost: number;
    active: boolean;
    optional_stock: number | null;
  }[];
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rows = await db
    .select()
    .from(schema.loyaltyRewards)
    .where(eq(schema.loyaltyRewards.restaurantId, restaurant_id!))
    .orderBy(asc(schema.loyaltyRewards.pointsCost));
  return {
    rewards: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      points_cost: r.pointsCost,
      active: r.active,
      optional_stock: r.stock,
    })),
    error: null,
  };
}

export async function upsertRestaurantReward(input: {
  id?: string;
  title: string;
  description?: string | null;
  pointsCost: number;
  active: boolean;
  optionalStock?: number | null;
}): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rid = restaurant_id!;
  const title = input.title?.trim();
  if (!title) return { error: "عنوان المكافأة مطلوب" };
  const pointsCost = Math.floor(Number(input.pointsCost) || 0);
  if (pointsCost < 1 || pointsCost > 10_000_000) return { error: "تكلفة النقاط غير صالحة" };

  const values = {
    title,
    description: input.description?.trim() || null,
    pointsCost,
    active: input.active === true,
    stock: input.optionalStock == null ? null : Math.max(0, Math.floor(Number(input.optionalStock) || 0)),
  };

  if (input.id) {
    const updated = await db
      .update(schema.loyaltyRewards)
      .set(values)
      .where(and(eq(schema.loyaltyRewards.id, input.id), eq(schema.loyaltyRewards.restaurantId, rid)))
      .returning({ id: schema.loyaltyRewards.id });
    if (!updated.length) return { error: "المكافأة غير موجودة" };
  } else {
    await db.insert(schema.loyaltyRewards).values({ ...values, restaurantId: rid });
  }
  revalidateCustomers();
  return { error: null };
}
