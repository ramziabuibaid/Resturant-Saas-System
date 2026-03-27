"use server";

import { createHash, randomBytes } from "crypto";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/app/actions/auth";
import type { RestaurantCustomerPhone } from "@/lib/types/database";
import { enqueuePointsBalanceNotification, renderPointsBalanceSmsTemplate } from "@/lib/notifications";
import { revalidatePath } from "next/cache";

const CUSTOMER_PHONE_COLUMNS_FULL =
  "id, restaurant_id, phone_normalized, first_seen_at, last_order_at, order_count, total_spent_cents, points_balance, lifetime_points_earned, lifetime_points_redeemed";

const CUSTOMER_PHONE_COLUMNS_LEGACY =
  "id, restaurant_id, phone_normalized, first_seen_at, last_order_at, order_count";

function isMissingColumnError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("total_spent_cents") ||
    m.includes("points_balance") ||
    m.includes("lifetime_points_earned") ||
    m.includes("lifetime_points_redeemed")
  );
}

function mapLegacyCustomerRow(r: {
  id: string;
  restaurant_id: string;
  phone_normalized: string;
  first_seen_at?: string | null;
  last_order_at?: string | null;
  order_count?: number | null;
}): RestaurantCustomerPhone {
  return {
    id: r.id,
    restaurant_id: r.restaurant_id,
    phone_normalized: r.phone_normalized,
    first_seen_at: r.first_seen_at ?? undefined,
    last_order_at: r.last_order_at ?? undefined,
    order_count: r.order_count ?? 0,
    total_spent_cents: 0,
    points_balance: 0,
    lifetime_points_earned: 0,
    lifetime_points_redeemed: 0,
  };
}

export async function listRestaurantCustomers(): Promise<{
  customers: RestaurantCustomerPhone[];
  error: string | null;
  /** true إن كانت قاعدة البيانات قديمة ولم تُضف أعمدة الولاء بعد */
  loyaltyColumnsMissing: boolean;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();

  const full = await supabase
    .from("restaurant_customer_phones")
    .select(CUSTOMER_PHONE_COLUMNS_FULL)
    .eq("restaurant_id", rid)
    .order("total_spent_cents", { ascending: false });

  if (full.error && isMissingColumnError(full.error.message)) {
    const legacy = await supabase
      .from("restaurant_customer_phones")
      .select(CUSTOMER_PHONE_COLUMNS_LEGACY)
      .eq("restaurant_id", rid)
      .order("last_order_at", { ascending: false });

    if (legacy.error) {
      return { customers: [], error: legacy.error.message, loyaltyColumnsMissing: false };
    }
    return {
      customers: (legacy.data ?? []).map((row) =>
        mapLegacyCustomerRow(
          row as {
            id: string;
            restaurant_id: string;
            phone_normalized: string;
            first_seen_at?: string | null;
            last_order_at?: string | null;
            order_count?: number | null;
          }
        )
      ),
      error: null,
      loyaltyColumnsMissing: true,
    };
  }

  if (full.error) {
    return { customers: [], error: full.error.message, loyaltyColumnsMissing: false };
  }

  return {
    customers: (full.data ?? []) as RestaurantCustomerPhone[],
    error: null,
    loyaltyColumnsMissing: false,
  };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function publicSiteBaseUrlFromHeaders(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (!host) return "";
    return `${proto}://${host}`.replace(/\/$/, "");
  } catch {
    return "";
  }
}

/**
 * يملأ customer_profiles + loyalty_accounts من restaurant_customer_phones
 * حتى يظهر الجدول الاحترافي لكل العملاء الحاليين (وليس فقط من طلبات جديدة).
 */
/** يحدّث صف `restaurant_customer_phones` ليطابق حساب الولاء الجديد (للعرض في الجدول القديم). */
export async function mirrorLoyaltyAccountToLegacyPhoneRow(
  restaurantId: string,
  customerId: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: prof } = await admin
    .from("customer_profiles")
    .select("phone_normalized")
    .eq("id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  const { data: acc } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_earned, lifetime_redeemed")
    .eq("customer_id", customerId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!prof || !acc) return;
  const phone = (prof as { phone_normalized: string }).phone_normalized;
  const a = acc as {
    points_balance: number;
    lifetime_earned: number;
    lifetime_redeemed: number;
  };
  await admin
    .from("restaurant_customer_phones")
    .update({
      points_balance: a.points_balance,
      lifetime_points_earned: a.lifetime_earned,
      lifetime_points_redeemed: a.lifetime_redeemed,
    })
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phone);
}

/** مزامنة عميل واحد من restaurant_customer_phones → profiles + loyalty_accounts (للمسار العام مثل المنيو). */
export async function syncLoyaltyProfileForPhoneFromLegacy(
  restaurantId: string,
  phoneNormalized: string
): Promise<void> {
  const admin = createAdminClient();
  const { data: leg, error } = await admin
    .from("restaurant_customer_phones")
    .select("phone_normalized, points_balance, lifetime_points_earned, lifetime_points_redeemed")
    .eq("restaurant_id", restaurantId)
    .eq("phone_normalized", phoneNormalized)
    .maybeSingle();
  if (error || !leg) return;
  const p = leg as {
    phone_normalized: string;
    points_balance: number | null;
    lifetime_points_earned: number | null;
    lifetime_points_redeemed: number | null;
  };
  const { data: prof, error: pe } = await admin
    .from("customer_profiles")
    .upsert(
      { restaurant_id: restaurantId, phone_normalized: p.phone_normalized },
      { onConflict: "restaurant_id,phone_normalized" }
    )
    .select("id")
    .maybeSingle();
  if (pe || !prof) return;
  const cid = (prof as { id: string }).id;
  const { data: existing } = await admin
    .from("loyalty_accounts")
    .select("points_balance, lifetime_earned, lifetime_redeemed")
    .eq("restaurant_id", restaurantId)
    .eq("customer_id", cid)
    .maybeSingle();
  const legBal = Number(p.points_balance ?? 0);
  const legEarn = Number(p.lifetime_points_earned ?? 0);
  const legRed = Number(p.lifetime_points_redeemed ?? 0);
  const ex = existing as {
    points_balance: number;
    lifetime_earned: number;
    lifetime_redeemed: number;
  } | null;
  const pb = Math.max(legBal, Number(ex?.points_balance ?? 0));
  const le = Math.max(legEarn, Number(ex?.lifetime_earned ?? 0));
  const lr = Math.max(legRed, Number(ex?.lifetime_redeemed ?? 0));
  await admin.from("loyalty_accounts").upsert(
    {
      restaurant_id: restaurantId,
      customer_id: cid,
      points_balance: pb,
      lifetime_earned: le,
      lifetime_redeemed: lr,
    },
    { onConflict: "restaurant_id,customer_id" }
  );
}

export async function syncLoyaltyProfilesFromLegacyPhones(restaurantId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: phones, error } = await admin
    .from("restaurant_customer_phones")
    .select(
      "phone_normalized, points_balance, lifetime_points_earned, lifetime_points_redeemed"
    )
    .eq("restaurant_id", restaurantId);
  if (error || !phones?.length) return;

  for (const row of phones) {
    const p = row as {
      phone_normalized: string;
      points_balance: number | null;
      lifetime_points_earned: number | null;
      lifetime_points_redeemed: number | null;
    };
    const { data: prof, error: pe } = await admin
      .from("customer_profiles")
      .upsert(
        { restaurant_id: restaurantId, phone_normalized: p.phone_normalized },
        { onConflict: "restaurant_id,phone_normalized" }
      )
      .select("id")
      .maybeSingle();
    if (pe || !prof) continue;
    const cid = (prof as { id: string }).id;

    const { data: existing } = await admin
      .from("loyalty_accounts")
      .select("points_balance, lifetime_earned, lifetime_redeemed")
      .eq("restaurant_id", restaurantId)
      .eq("customer_id", cid)
      .maybeSingle();

    const legBal = Number(p.points_balance ?? 0);
    const legEarn = Number(p.lifetime_points_earned ?? 0);
    const legRed = Number(p.lifetime_points_redeemed ?? 0);

    const ex = existing as {
      points_balance: number;
      lifetime_earned: number;
      lifetime_redeemed: number;
    } | null;

    const pb = Math.max(legBal, Number(ex?.points_balance ?? 0));
    const le = Math.max(legEarn, Number(ex?.lifetime_earned ?? 0));
    const lr = Math.max(legRed, Number(ex?.lifetime_redeemed ?? 0));

    await admin.from("loyalty_accounts").upsert(
      {
        restaurant_id: restaurantId,
        customer_id: cid,
        points_balance: pb,
        lifetime_earned: le,
        lifetime_redeemed: lr,
      },
      { onConflict: "restaurant_id,customer_id" }
    );
  }
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
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();

  await syncLoyaltyProfilesFromLegacyPhones(rid);

  const { data: customers, error } = await admin
    .from("customer_profiles")
    .select("id, phone_normalized, name")
    .eq("restaurant_id", rid);

  if (error) return { customers: [], error: error.message };
  if (!customers?.length) return { customers: [], error: null };

  const customerIds = customers.map((c) => c.id as string);
  const [accountsRes, txRes] = await Promise.all([
    admin
      .from("loyalty_accounts")
      .select("customer_id, points_balance, lifetime_earned, lifetime_redeemed, updated_at")
      .eq("restaurant_id", rid)
      .in("customer_id", customerIds),
    admin
      .from("loyalty_transactions")
      .select("customer_id")
      .eq("restaurant_id", rid)
      .in("customer_id", customerIds),
  ]);

  const accByCustomer = new Map(
    (accountsRes.data ?? []).map((a) => [
      (a as { customer_id: string }).customer_id,
      a as {
        customer_id: string;
        points_balance: number;
        lifetime_earned: number;
        lifetime_redeemed: number;
        updated_at: string;
      },
    ])
  );
  const txCountByCustomer = new Map<string, number>();
  for (const tx of txRes.data ?? []) {
    const cid = (tx as { customer_id: string }).customer_id;
    txCountByCustomer.set(cid, (txCountByCustomer.get(cid) ?? 0) + 1);
  }

  const rows: LoyaltyDashboardCustomer[] = (customers ?? []).map((c) => {
    const customer = c as { id: string; phone_normalized: string; name: string | null };
    const acc = accByCustomer.get(customer.id);
    return {
      customer_id: customer.id,
      phone_normalized: customer.phone_normalized,
      name: customer.name,
      points_balance: Number(acc?.points_balance ?? 0),
      lifetime_earned: Number(acc?.lifetime_earned ?? 0),
      lifetime_redeemed: Number(acc?.lifetime_redeemed ?? 0),
      tx_count: txCountByCustomer.get(customer.id) ?? 0,
      updated_at: acc?.updated_at ?? new Date(0).toISOString(),
    };
  });
  rows.sort((a, b) => b.points_balance - a.points_balance);
  return { customers: rows, error: null };
}

export async function generateCustomerMagicLink(customerId: string): Promise<{
  /** رابط مطلق للنسخ أو الإرسال */
  url: string | null;
  /** مسار نسبي */
  path: string | null;
  error: string | null;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();
  const rawToken = randomBytes(24).toString("hex");
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString();

  const { data: customer, error: customerErr } = await admin
    .from("customer_profiles")
    .select("id")
    .eq("id", customerId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (customerErr || !customer) return { url: null, path: null, error: "العميل غير موجود" };

  const { error } = await admin.from("customer_public_links").insert({
    restaurant_id: rid,
    customer_id: customerId,
    token_hash: tokenHash,
    expires_at: expiresAt,
    is_revoked: false,
  });
  if (error) return { url: null, path: null, error: error.message };

  const path = `/loyalty/${rawToken}`;
  const base = await publicSiteBaseUrlFromHeaders();
  const url = base ? `${base}${path}` : path;
  return { url, path, error: null };
}

/** إدراج إشعار برصيد النقاط مع رابط عام (للطابور ثم الإرسال عبر المعالج أو مزود خارجي). */
export async function enqueueCustomerPointsNotification(customerId: string): Promise<{
  queued: boolean;
  previewMessage: string;
  error: string | null;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();

  const linkRes = await generateCustomerMagicLink(customerId);
  if (linkRes.error || !linkRes.url) {
    return { queued: false, previewMessage: "", error: linkRes.error ?? "تعذر إنشاء الرابط" };
  }

  const { data: cust } = await admin
    .from("customer_profiles")
    .select("name")
    .eq("id", customerId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  const { data: acc } = await admin
    .from("loyalty_accounts")
    .select("points_balance")
    .eq("customer_id", customerId)
    .eq("restaurant_id", rid)
    .maybeSingle();

  const name = (cust as { name: string | null } | null)?.name ?? null;
  const balance = Number((acc as { points_balance: number } | null)?.points_balance ?? 0);

  await enqueuePointsBalanceNotification({
    restaurantId: rid,
    customerId,
    customerName: name,
    pointsBalance: balance,
    publicLink: linkRes.url,
  });

  const previewMessage = renderPointsBalanceSmsTemplate({
    customerName: name,
    pointsBalance: balance,
    publicLink: linkRes.url,
  });

  revalidatePath("/owner/customers");
  revalidatePath("/admin/customers");
  return { queued: true, previewMessage, error: null };
}

export async function redeemCustomerCashPoints(
  customerId: string,
  pointsRequested: number,
  orderId?: string | null
): Promise<{
  pointsRedeemed: number;
  discountCents: number;
  newBalance: number;
  error: string | null;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();

  const { data: customer, error: customerErr } = await admin
    .from("customer_profiles")
    .select("id, restaurant_id")
    .eq("id", customerId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (customerErr || !customer) {
    return { pointsRedeemed: 0, discountCents: 0, newBalance: 0, error: "العميل غير موجود" };
  }

  const oid = orderId?.trim() ? orderId.trim() : null;

  const rpc = await admin.rpc("redeem_loyalty_cash", {
    p_customer_id: customerId,
    p_order_id: oid,
    p_points_requested: Math.max(1, Math.floor(pointsRequested)),
  });

  if (rpc.error || !Array.isArray(rpc.data) || !rpc.data[0]) {
    return {
      pointsRedeemed: 0,
      discountCents: 0,
      newBalance: 0,
      error: rpc.error?.message ?? "فشل الاستبدال النقدي",
    };
  }
  const row = rpc.data[0] as {
    points_redeemed: number;
    discount_cents: number;
    new_balance: number;
  };
  await mirrorLoyaltyAccountToLegacyPhoneRow(rid, customerId);
  revalidatePath("/owner/customers");
  revalidatePath("/admin/customers");
  return {
    pointsRedeemed: Number(row.points_redeemed ?? 0),
    discountCents: Number(row.discount_cents ?? 0),
    newBalance: Number(row.new_balance ?? 0),
    error: null,
  };
}

export async function redeemCustomerReward(
  customerId: string,
  rewardId: string,
  orderId?: string
): Promise<{
  pointsSpent: number;
  newBalance: number;
  redemptionId: string | null;
  error: string | null;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();

  const { data: customer, error: customerErr } = await admin
    .from("customer_profiles")
    .select("id, restaurant_id")
    .eq("id", customerId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (customerErr || !customer) {
    return { pointsSpent: 0, newBalance: 0, redemptionId: null, error: "العميل غير موجود" };
  }

  const rpc = await admin.rpc("redeem_loyalty_reward", {
    p_customer_id: customerId,
    p_reward_id: rewardId,
    p_order_id: orderId ?? null,
  });
  if (rpc.error || !Array.isArray(rpc.data) || !rpc.data[0]) {
    return {
      pointsSpent: 0,
      newBalance: 0,
      redemptionId: null,
      error: rpc.error?.message ?? "فشل استبدال المكافأة",
    };
  }
  const row = rpc.data[0] as {
    points_spent: number;
    new_balance: number;
    redemption_id: string;
  };
  await mirrorLoyaltyAccountToLegacyPhoneRow(rid, customerId);
  revalidatePath("/owner/customers");
  revalidatePath("/admin/customers");
  return {
    pointsSpent: Number(row.points_spent ?? 0),
    newBalance: Number(row.new_balance ?? 0),
    redemptionId: row.redemption_id ?? null,
    error: null,
  };
}

export async function getLoyaltyPortalByToken(token: string): Promise<{
  customer: { name: string | null; phone: string; points_balance: number } | null;
  transactions: {
    id: string;
    tx_type: string;
    points_delta: number;
    money_value_cents: number;
    created_at: string;
  }[];
  rewards: {
    id: string;
    title: string;
    points_cost: number;
    description: string | null;
  }[];
  error: string | null;
}> {
  const raw = token.trim();
  if (!raw) return { customer: null, transactions: [], rewards: [], error: "الرابط غير صالح" };
  const admin = createAdminClient();
  const tokenHash = sha256Hex(raw);

  const { data: link, error: linkErr } = await admin
    .from("customer_public_links")
    .select("restaurant_id, customer_id, expires_at, is_revoked")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (linkErr || !link) return { customer: null, transactions: [], rewards: [], error: "الرابط غير موجود" };
  if (link.is_revoked) return { customer: null, transactions: [], rewards: [], error: "تم إلغاء هذا الرابط" };
  if (new Date(link.expires_at).getTime() < Date.now()) {
    return { customer: null, transactions: [], rewards: [], error: "انتهت صلاحية الرابط" };
  }

  await admin
    .from("customer_public_links")
    .update({ last_access_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  const [customerRes, accountRes, txRes, rewardsRes] = await Promise.all([
    admin
      .from("customer_profiles")
      .select("name, phone_normalized")
      .eq("id", link.customer_id)
      .eq("restaurant_id", link.restaurant_id)
      .maybeSingle(),
    admin
      .from("loyalty_accounts")
      .select("points_balance")
      .eq("customer_id", link.customer_id)
      .eq("restaurant_id", link.restaurant_id)
      .maybeSingle(),
    admin
      .from("loyalty_transactions")
      .select("id, tx_type, points_delta, money_value_cents, created_at")
      .eq("customer_id", link.customer_id)
      .eq("restaurant_id", link.restaurant_id)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("loyalty_rewards_catalog")
      .select("id, title, points_cost, description")
      .eq("restaurant_id", link.restaurant_id)
      .eq("active", true)
      .order("points_cost", { ascending: true }),
  ]);

  const customerRow = customerRes.data as { name: string | null; phone_normalized: string } | null;
  const accountRow = accountRes.data as { points_balance: number } | null;
  return {
    customer: customerRow
      ? {
          name: customerRow.name,
          phone: customerRow.phone_normalized,
          points_balance: Number(accountRow?.points_balance ?? 0),
        }
      : null,
    transactions: (txRes.data ?? []) as {
      id: string;
      tx_type: string;
      points_delta: number;
      money_value_cents: number;
      created_at: string;
    }[],
    rewards: (rewardsRes.data ?? []) as {
      id: string;
      title: string;
      points_cost: number;
      description: string | null;
    }[],
    error: null,
  };
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
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_rewards_catalog")
    .select("id, title, description, points_cost, active, optional_stock")
    .eq("restaurant_id", rid)
    .order("points_cost", { ascending: true });
  if (error) return { rewards: [], error: error.message };
  return {
    rewards: (data ?? []) as {
      id: string;
      title: string;
      description: string | null;
      points_cost: number;
      active: boolean;
      optional_stock: number | null;
    }[],
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
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();
  const payload = {
    restaurant_id: rid,
    title: input.title.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    points_cost: Math.max(1, Math.floor(input.pointsCost)),
    active: input.active,
    optional_stock:
      input.optionalStock == null ? null : Math.max(0, Math.floor(input.optionalStock)),
  };
  if (!payload.title) return { error: "عنوان المكافأة مطلوب" };

  if (input.id) {
    const { error } = await admin
      .from("loyalty_rewards_catalog")
      .update(payload)
      .eq("id", input.id)
      .eq("restaurant_id", rid);
    return { error: error?.message ?? null };
  }
  const { error } = await admin.from("loyalty_rewards_catalog").insert(payload);
  return { error: error?.message ?? null };
}
