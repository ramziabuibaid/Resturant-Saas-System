"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getProfileOrRedirect } from "@/app/actions/auth";
import type { RestaurantWaiter } from "@/lib/types/database";

function revalidateWaiterPaths() {
  revalidatePath("/owner/settings");
  revalidatePath("/admin/settings");
  revalidatePath("/owner/tables");
  revalidatePath("/admin/tables");
  revalidatePath("/owner/orders");
  revalidatePath("/admin/orders");
}

export async function listRestaurantWaiters(): Promise<{
  waiters: RestaurantWaiter[];
  error: string | null;
}> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurant_waiters")
    .select("*")
    .eq("restaurant_id", rid)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) return { waiters: [], error: error.message };
  return { waiters: (data ?? []) as RestaurantWaiter[], error: null };
}

export async function setWaitersSystemEnabled(
  enabled: boolean
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ waiters_system_enabled: enabled })
    .eq("id", rid);
  if (error) return { error: error.message };
  revalidateWaiterPaths();
  return { error: null };
}

export async function createRestaurantWaiter(
  name: string
): Promise<{ id: string | null; error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const trimmed = name.trim();
  if (!trimmed) return { id: null, error: "اسم الويتر مطلوب" };

  const supabase = await createClient();
  const { count } = await supabase
    .from("restaurant_waiters")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", rid);

  const { data, error } = await supabase
    .from("restaurant_waiters")
    .insert({
      restaurant_id: rid,
      name: trimmed,
      sort_order: (count ?? 0) + 1,
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  revalidateWaiterPaths();
  return { id: (data as { id: string }).id, error: null };
}

export async function updateRestaurantWaiterName(
  waiterId: string,
  name: string
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const trimmed = name.trim();
  if (!trimmed) return { error: "اسم الويتر مطلوب" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_waiters")
    .update({ name: trimmed })
    .eq("id", waiterId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidateWaiterPaths();
  return { error: null };
}

export async function deleteRestaurantWaiter(
  waiterId: string
): Promise<{ error: string | null }> {
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const supabase = await createClient();
  const { error } = await supabase
    .from("restaurant_waiters")
    .delete()
    .eq("id", waiterId)
    .eq("restaurant_id", rid);
  if (error) return { error: error.message };
  revalidateWaiterPaths();
  return { error: null };
}
