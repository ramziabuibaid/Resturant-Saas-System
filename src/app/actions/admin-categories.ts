"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import { toCategoryDto } from "@/lib/data/menu";
import type { Category } from "@/lib/types/database";

/*
 * المطعم يُؤخذ دائماً من جلسة المستخدم — معرّف المطعم القادم من المتصفح يُتجاهل.
 * (معامل restaurantId باقٍ في التواقيع للتوافق مع الواجهة فقط.)
 */

function revalidateMenu() {
  revalidatePath("/admin/categories");
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
}

export async function createCategory(
  _restaurantId: string,
  name: string
): Promise<{ data: Category | null; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const restaurantId = restaurant_id!;
  const clean = name.trim();
  if (!clean) return { data: null, error: "اسم التصنيف مطلوب" };

  const [{ last }] = await db
    .select({ last: max(schema.categories.orderIndex) })
    .from(schema.categories)
    .where(eq(schema.categories.restaurantId, restaurantId));
  const [row] = await db
    .insert(schema.categories)
    .values({ restaurantId, name: clean, orderIndex: (last ?? -1) + 1 })
    .returning();

  revalidateMenu();
  return { data: toCategoryDto(row), error: null };
}

export async function updateCategory(
  id: string,
  name: string
): Promise<{ data: Category | null; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const clean = name.trim();
  if (!clean) return { data: null, error: "اسم التصنيف مطلوب" };

  const [row] = await db
    .update(schema.categories)
    .set({ name: clean })
    .where(and(eq(schema.categories.id, id), eq(schema.categories.restaurantId, restaurant_id!)))
    .returning();
  if (!row) return { data: null, error: "التصنيف غير موجود أو لا يتبع مطعمك." };

  revalidateMenu();
  return { data: toCategoryDto(row), error: null };
}

/** حذف التصنيف — أصنافه تبقى بلا تصنيف (ON DELETE SET NULL) */
export async function deleteCategory(id: string, _restaurantId: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const deleted = await db
    .delete(schema.categories)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.restaurantId, restaurant_id!)))
    .returning({ id: schema.categories.id });
  if (!deleted.length) return { error: "التصنيف غير موجود أو لا يتبع مطعمك." };

  revalidateMenu();
  return { error: null };
}
