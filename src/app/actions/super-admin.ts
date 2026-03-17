"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Restaurant } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export type RestaurantWithOwner = Restaurant & { owner_username?: string | null };

export async function getAllRestaurants(): Promise<RestaurantWithOwner[]> {
  const supabase = await createClient();
  const { data: restaurants, error } = await supabase
    .from("restaurants")
    .select("id, name, subdomain, status, created_at, logo_url")
    .order("name");
  if (error || !restaurants?.length) return (restaurants ?? []) as RestaurantWithOwner[];

  const ids = restaurants.map((r) => r.id);
  const admin = createAdminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("restaurant_id, username")
    .in("restaurant_id", ids)
    .eq("role", "owner");
  const usernameByRestaurant = new Map<string, string | null>();
  for (const p of profiles ?? []) {
    if (p.restaurant_id) usernameByRestaurant.set(p.restaurant_id, p.username ?? null);
  }

  return restaurants.map((r) => ({
    ...r,
    owner_username: usernameByRestaurant.get(r.id) ?? null,
  })) as RestaurantWithOwner[];
}

export type CreateRestaurantInput = {
  name: string;
  subdomain: string;
  status?: "active" | "suspended" | "trial";
};

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<{ data: Restaurant | null; error: string | null }> {
  const subdomain = input.subdomain.trim().toLowerCase().replace(/\s+/g, "-");
  if (!subdomain) return { data: null, error: "Subdomain is required" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .ilike("subdomain", subdomain)
    .maybeSingle();
  if (existing) return { data: null, error: "Subdomain already in use" };

  const { data, error } = await supabase
    .from("restaurants")
    .insert({
      name: input.name.trim(),
      subdomain,
      status: input.status ?? "active",
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { data: data as Restaurant, error: null };
}

export async function deleteRestaurant(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("restaurants").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}

/** Aggregate counts for super-admin dashboard. */
export async function getSuperAdminStats(): Promise<{
  totalRestaurants: number;
  activeRestaurants: number;
  totalMenuItems: number;
}> {
  const supabase = await createClient();
  const [allRes, activeRes, itemsRes] = await Promise.all([
    supabase.from("restaurants").select("id", { count: "exact", head: true }),
    supabase.from("restaurants").select("id", { count: "exact", head: true }).or("status.eq.active,status.is.null"),
    supabase.from("menu_items").select("id", { count: "exact", head: true }),
  ]);
  return {
    totalRestaurants: allRes.count ?? 0,
    activeRestaurants: activeRes.count ?? 0,
    totalMenuItems: itemsRes.count ?? 0,
  };
}
