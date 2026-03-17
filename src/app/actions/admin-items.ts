"use server";

import { createClient } from "@/lib/supabase/server";
import type { Restaurant, Category, MenuItem, PriceOption } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getRestaurants(): Promise<Restaurant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("name");
  if (error) return [];
  return (data ?? []) as Restaurant[];
}

export async function getCategories(restaurantId: string): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");
  if (error) return [];
  return (data ?? []) as MenuItem[];
}

export type CreateMenuItemInput = {
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category_id: string | null;
  image_url: string | null;
  is_available?: boolean;
  /** خيارات أسعار حسب الحجم/الوزن (نفر، نصف كيلو، كيلو، صغير، وسط، كبير...) */
  price_options?: PriceOption[] | null;
};

export async function createMenuItem(
  input: CreateMenuItemInput
): Promise<{ data: MenuItem | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      restaurant_id: input.restaurant_id,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      category_id: input.category_id || null,
      image_url: input.image_url || null,
      is_available: input.is_available ?? true,
      price_options: input.price_options ?? null,
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  revalidatePath("/owner/items");
  revalidatePath("/owner");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  return { data: data as MenuItem, error: null };
}

export type UpdateMenuItemInput = {
  name?: string;
  description?: string | null;
  price?: number;
  category_id?: string | null;
  image_url?: string | null;
  is_available?: boolean;
  price_options?: PriceOption[] | null;
};

export async function updateMenuItem(
  id: string,
  input: UpdateMenuItemInput
): Promise<{ data: MenuItem | null; error: string | null }> {
  const supabase = await createClient();
  const payload: Record<string, unknown> = {};
  if (input.name !== undefined) payload.name = input.name.trim();
  if (input.description !== undefined)
    payload.description = input.description?.trim() || null;
  if (input.price !== undefined) payload.price = input.price;
  if (input.category_id !== undefined) payload.category_id = input.category_id;
  if (input.image_url !== undefined) payload.image_url = input.image_url;
  if (input.is_available !== undefined) payload.is_available = input.is_available;
  if (input.price_options !== undefined) payload.price_options = input.price_options;
  const { data, error } = await supabase
    .from("menu_items")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  revalidatePath("/owner/items");
  revalidatePath("/owner");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  return { data: data as MenuItem, error: null };
}

export async function deleteMenuItem(
  id: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/owner/items");
  revalidatePath("/owner");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  return { error: null };
}
