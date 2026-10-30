"use server";

import { and, asc, count, eq, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { isSuperAdminRequest, UNAUTHORIZED } from "@/lib/auth/current-user";
import { isSubdomainTaken, toRestaurantDto, validateSubdomain } from "@/lib/data/restaurants";
import type { Restaurant } from "@/lib/types/database";

export type RestaurantWithOwner = Restaurant & { owner_username?: string | null };

export async function getAllRestaurants(): Promise<RestaurantWithOwner[]> {
  if (!(await isSuperAdminRequest())) return [];
  const rows = await db.select().from(schema.restaurants).orderBy(asc(schema.restaurants.name));
  if (!rows.length) return [];

  const owners = await db
    .select({ restaurantId: schema.users.restaurantId, username: schema.users.username })
    .from(schema.users)
    .where(
      and(
        eq(schema.users.role, "owner"),
        inArray(
          schema.users.restaurantId,
          rows.map((r) => r.id)
        )
      )
    );
  const usernameByRestaurant = new Map(owners.map((o) => [o.restaurantId, o.username]));

  return rows.map((r) => ({
    ...toRestaurantDto(r),
    owner_username: usernameByRestaurant.get(r.id) ?? null,
  }));
}

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

/** Aggregate counts for super-admin dashboard. */
export async function getSuperAdminStats(): Promise<{
  totalRestaurants: number;
  activeRestaurants: number;
  totalMenuItems: number;
}> {
  if (!(await isSuperAdminRequest())) return { totalRestaurants: 0, activeRestaurants: 0, totalMenuItems: 0 };
  const [[all], [active], [items]] = await Promise.all([
    db.select({ n: count() }).from(schema.restaurants),
    db
      .select({ n: count() })
      .from(schema.restaurants)
      .where(or(eq(schema.restaurants.status, "active"), eq(schema.restaurants.status, "trial"))),
    db.select({ n: count() }).from(schema.menuItems),
  ]);
  return { totalRestaurants: all.n, activeRestaurants: active.n, totalMenuItems: items.n };
}
