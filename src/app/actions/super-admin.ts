"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { isSuperAdminRequest, UNAUTHORIZED } from "@/lib/auth/current-user";
import { isSubdomainTaken, toRestaurantDto, validateSubdomain } from "@/lib/data/restaurants";
import type { Restaurant } from "@/lib/types/database";

export type CreateRestaurantInput = {
  name: string;
  subdomain: string;
  status?: "active" | "suspended" | "trial";
};

export async function updateRestaurantSubdomain(
  restaurantId: string,
  newSubdomain: string
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  const sub = validateSubdomain(newSubdomain ?? "");
  if ("error" in sub) return { error: sub.error };
  if (await isSubdomainTaken(sub.value, restaurantId)) return { error: "النطاق الفرعي مستخدم لمطعم آخر" };

  await db
    .update(schema.restaurants)
    .set({ subdomain: sub.value })
    .where(eq(schema.restaurants.id, restaurantId));

  revalidatePath("/admin/restaurants");
  revalidatePath("/admin");
  return { error: null };
}

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<{ data: Restaurant | null; error: string | null }> {
  if (!(await isSuperAdminRequest())) return { data: null, error: UNAUTHORIZED };
  const name = input.name?.trim();
  if (!name) return { data: null, error: "اسم المطعم مطلوب" };
  const sub = validateSubdomain(input.subdomain ?? "");
  if ("error" in sub) return { data: null, error: sub.error };
  if (await isSubdomainTaken(sub.value)) return { data: null, error: "النطاق الفرعي مستخدم لمطعم آخر" };

  const [row] = await db
    .insert(schema.restaurants)
    .values({ name, subdomain: sub.value, status: input.status ?? "active" })
    .returning();

  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { data: toRestaurantDto(row), error: null };
}

/** حذف المطعم وكل بياناته (الأصناف، الطلبات، الزبائن، حساب المالك…) عبر ON DELETE CASCADE */
export async function deleteRestaurant(id: string): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  await db.delete(schema.restaurants).where(eq(schema.restaurants.id, id));
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}

export async function updateRestaurantStatus(
  restaurantId: string,
  status: "active" | "trial" | "suspended"
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  if (!["active", "trial", "suspended"].includes(status)) return { error: "حالة غير صالحة" };
  const updated = await db
    .update(schema.restaurants)
    .set({ status })
    .where(eq(schema.restaurants.id, restaurantId))
    .returning({ id: schema.restaurants.id });
  if (!updated.length) return { error: "المطعم غير موجود" };
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}
