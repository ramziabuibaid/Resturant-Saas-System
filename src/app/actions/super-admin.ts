"use server";

import { createClient } from "@/lib/supabase/server";
import type { Restaurant } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getAllRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, subdomain, status, created_at, logo_url")
    .order("name");
  if (error) return [];
  return (data ?? []) as Restaurant[];
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
