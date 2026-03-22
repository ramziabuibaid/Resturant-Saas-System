"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfileOrRedirect } from "@/app/actions/auth";
import type { RestaurantCustomerPhone } from "@/lib/types/database";

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
