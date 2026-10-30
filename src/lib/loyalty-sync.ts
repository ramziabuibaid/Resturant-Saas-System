import { createAdminClient } from "@/lib/supabase/admin";

/*
 * مزامنة داخلية بين جدول الهواتف القديم وجداول الولاء الجديدة.
 * عمداً ليست في ملف "use server" — كل تصدير هناك يصبح endpoint عاماً
 * يستطيع أي زائر استدعاءه بمعرّف أي مطعم.
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

/**
 * يملأ customer_profiles + loyalty_accounts من restaurant_customer_phones
 * حتى يظهر الجدول الاحترافي لكل العملاء الحاليين (وليس فقط من طلبات جديدة).
 */
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
