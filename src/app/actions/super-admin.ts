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

const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const SUBDOMAIN_MIN = 2;
const SUBDOMAIN_MAX = 63;

export async function updateRestaurantSubdomain(
  restaurantId: string,
  newSubdomain: string
): Promise<{ error: string | null }> {
  const subRaw = newSubdomain?.trim().toLowerCase().replace(/\s+/g, "-") ?? "";
  if (!subRaw) return { error: "النطاق الفرعي مطلوب" };
  if (subRaw.length < SUBDOMAIN_MIN || subRaw.length > SUBDOMAIN_MAX) {
    return { error: `النطاق الفرعي بين ${SUBDOMAIN_MIN} و ${SUBDOMAIN_MAX} حرفاً` };
  }
  if (!SUBDOMAIN_REGEX.test(subRaw)) return { error: "النطاق الفرعي: حروف إنجليزية صغيرة، أرقام وشرطة فقط" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("restaurants")
    .select("id")
    .ilike("subdomain", subRaw)
    .neq("id", restaurantId)
    .maybeSingle();

  if (existing) return { error: "النطاق الفرعي مستخدم لمطعم آخر" };

  const { error: updateErr } = await supabase
    .from("restaurants")
    .update({ subdomain: subRaw })
    .eq("id", restaurantId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath("/admin/restaurants");
  revalidatePath("/admin");
  return { error: null };
}

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
  // Super admin: احذف التبعيات أولاً لتجنب مشاكل قيود المفاتيح الأجنبية
  const admin = createAdminClient();

  const { error: menuItemsErr } = await admin.from("menu_items").delete().eq("restaurant_id", id);
  if (menuItemsErr) return { error: menuItemsErr.message };

  const { error: categoriesErr } = await admin.from("categories").delete().eq("restaurant_id", id);
  if (categoriesErr) return { error: categoriesErr.message };

  const { error: restaurantsErr } = await admin.from("restaurants").delete().eq("id", id);
  if (restaurantsErr) return { error: restaurantsErr.message };

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
