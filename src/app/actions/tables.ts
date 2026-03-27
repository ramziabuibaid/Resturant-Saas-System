"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getProfileOrRedirect } from "@/app/actions/auth";
import type { RestaurantTable } from "@/lib/types/database";

function revalidateRestaurantPaths() {
  revalidatePath("/owner/tables");
  revalidatePath("/admin/tables");
  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
}

export async function listRestaurantTables(): Promise<{
  tables: RestaurantTable[];
  error: string | null;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_tables")
    .select("*")
    .eq("restaurant_id", rid)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  if (error) return { tables: [], error: error.message };
  return { tables: (data ?? []) as RestaurantTable[], error: null };
}

export async function createRestaurantTable(label: string): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const trimmed = label.trim();
  if (!trimmed) return { error: "اسم الطاولة مطلوب" };

  const supabase = await createClient();
  const { count } = await supabase
    .from("restaurant_tables")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", rid);

  const { error } = await supabase.from("restaurant_tables").insert({
    restaurant_id: rid,
    label: trimmed,
    sort_order: (count ?? 0) + 1,
  });
  if (error) return { error: error.message };
  revalidateRestaurantPaths();
  return { error: null };
}

export async function deleteRestaurantTable(tableId: string): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_tables")
    .delete()
    .eq("id", tableId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidateRestaurantPaths();
  return { error: null };
}

/** ربط طاولة بويتر (أو إلغاء الربط بـ null) — يتطلب عمود waiter_id بعد تشغيل waiters-system.sql */
export async function setRestaurantTableWaiter(
  tableId: string,
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
    .from("restaurant_tables")
    .update({ waiter_id: waiterId })
    .eq("id", tableId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidateRestaurantPaths();
  return { error: null };
}
