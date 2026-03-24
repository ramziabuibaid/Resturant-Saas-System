"use server";

import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/types/database";
import { revalidatePath } from "next/cache";

export async function getCategoriesForRestaurant(
  restaurantId: string
): Promise<Category[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("name");
  if (error) return [];
  return (data ?? []) as Category[];
}

export async function createCategory(
  restaurantId: string,
  name: string
): Promise<{ data: Category | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ restaurant_id: restaurantId, name: name.trim() })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  revalidatePath("/owner/categories");
  revalidatePath("/owner/items");
  revalidatePath("/owner");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  return { data: data as Category, error: null };
}

export async function updateCategory(
  id: string,
  name: string
): Promise<{ data: Category | null; error: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .update({ name: name.trim() })
    .eq("id", id)
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  revalidatePath("/owner/categories");
  revalidatePath("/owner/items");
  revalidatePath("/owner");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  return { data: data as Category, error: null };
}

export async function deleteCategory(
  id: string,
  restaurantId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("categories")
    .select("id")
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (!row) {
    return { error: "التصنيف غير موجود أو لا يتبع مطعمك." };
  }

  const { error: unlinkErr } = await supabase
    .from("menu_items")
    .update({ category_id: null })
    .eq("category_id", id)
    .eq("restaurant_id", restaurantId);
  if (unlinkErr) return { error: unlinkErr.message };

  const { data: deleted, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("restaurant_id", restaurantId)
    .select("id");
  if (error) return { error: error.message };
  if (!deleted?.length) {
    return {
      error:
        "لم يُحذف التصنيف. نفّذ في Supabase ملف supabase/rls-categories-owner.sql لمنح صاحب المطعم صلاحية الحذف.",
    };
  }

  revalidatePath("/owner/categories");
  revalidatePath("/owner/items");
  revalidatePath("/owner");
  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
  return { error: null };
}
