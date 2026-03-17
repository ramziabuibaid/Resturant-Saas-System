"use server";

import { createClient } from "@/lib/supabase/server";
import type { Restaurant, Category, MenuItem } from "@/lib/types/database";

export type MenuItemsResult = {
  restaurant: Restaurant | null;
  categories: Category[];
  menuItems: MenuItem[];
  error: string | null;
};

/**
 * Fetches the restaurant and its menu items (and categories) by subdomain.
 * Use this from Server Components, Client Components, or route handlers.
 */
export async function getMenuItemsBySubdomain(
  subdomain: string
): Promise<MenuItemsResult> {
  const supabase = await createClient();
  const slug = subdomain.trim().toLowerCase();
  if (!slug) {
    return { restaurant: null, categories: [], menuItems: [], error: "Missing subdomain" };
  }

  try {
    // Case-insensitive match so "albaraka" matches "Albaraka" in DB
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("*")
      .ilike("subdomain", slug)
      .maybeSingle();

    if (restaurantError) {
      return {
        restaurant: null,
        categories: [],
        menuItems: [],
        error: `Restaurants: ${restaurantError.message}`,
      };
    }
    if (!restaurant) {
      return {
        restaurant: null,
        categories: [],
        menuItems: [],
        error: "Restaurant not found",
      };
    }

    const restaurantId = (restaurant as Restaurant).id;

    const [categoriesRes, menuItemsRes] = await Promise.all([
      supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name"),
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("name"),
    ]);

    const categories = (categoriesRes.data ?? []) as Category[];
    const menuItems = (menuItemsRes.data ?? []) as MenuItem[];

    // Only restaurant fetch failure triggers 404. Empty or failed categories/menu_items still show the page.
    return {
      restaurant: restaurant as Restaurant,
      categories,
      menuItems,
      error: null,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to fetch menu";
    return {
      restaurant: null,
      categories: [],
      menuItems: [],
      error: message,
    };
  }
}

/**
 * Fetches only the restaurant by subdomain (for middleware or lightweight checks).
 */
export async function getRestaurantBySubdomain(subdomain: string) {
  const supabase = await createClient();
  const slug = subdomain.trim().toLowerCase();
  if (!slug) return { data: null, error: "Missing subdomain" };

  const { data, error } = await supabase
    .from("restaurants")
    .select("id, name, subdomain, logo_url")
    .ilike("subdomain", slug)
    .maybeSingle();

  return { data: data as Restaurant | null, error: error?.message ?? null };
}
