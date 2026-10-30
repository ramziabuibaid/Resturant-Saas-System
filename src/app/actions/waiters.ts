"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import type { RestaurantWaiter } from "@/lib/types/database";

function revalidateWaiterPaths() {
  revalidatePath("/admin/settings");
  revalidatePath("/admin/tables");
  revalidatePath("/admin/orders");
}

function ownWaiter(waiterId: string, restaurantId: string) {
  return and(eq(schema.restaurantWaiters.id, waiterId), eq(schema.restaurantWaiters.restaurantId, restaurantId));
}

export async function listRestaurantWaiters(): Promise<{
  waiters: RestaurantWaiter[];
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rows = await db
    .select()
    .from(schema.restaurantWaiters)
    .where(eq(schema.restaurantWaiters.restaurantId, restaurant_id!))
    .orderBy(asc(schema.restaurantWaiters.sortOrder), asc(schema.restaurantWaiters.name));
  return {
    waiters: rows.map((w) => ({
      id: w.id,
      restaurant_id: w.restaurantId,
      name: w.name,
      sort_order: w.sortOrder,
      created_at: w.createdAt.toISOString(),
    })),
    error: null,
  };
}

export async function setWaitersSystemEnabled(enabled: boolean): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  await db
    .update(schema.restaurants)
    .set({ waitersSystemEnabled: enabled === true })
    .where(eq(schema.restaurants.id, restaurant_id!));
  revalidateWaiterPaths();
  return { error: null };
}

export async function createRestaurantWaiter(name: string): Promise<{ id: string | null; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const restaurantId = restaurant_id!;
  const trimmed = name.trim();
  if (!trimmed) return { id: null, error: "اسم الويتر مطلوب" };

  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.restaurantWaiters)
    .where(eq(schema.restaurantWaiters.restaurantId, restaurantId));
  const [row] = await db
    .insert(schema.restaurantWaiters)
    .values({ restaurantId, name: trimmed, sortOrder: n + 1 })
    .returning({ id: schema.restaurantWaiters.id });
  revalidateWaiterPaths();
  return { id: row.id, error: null };
}

export async function updateRestaurantWaiterName(waiterId: string, name: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const trimmed = name.trim();
  if (!trimmed) return { error: "اسم الويتر مطلوب" };
  await db.update(schema.restaurantWaiters).set({ name: trimmed }).where(ownWaiter(waiterId, restaurant_id!));
  revalidateWaiterPaths();
  return { error: null };
}

/** حذف الويتر — طاولاته وطلباته تبقى بلا ويتر (ON DELETE SET NULL) */
export async function deleteRestaurantWaiter(waiterId: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  await db.delete(schema.restaurantWaiters).where(ownWaiter(waiterId, restaurant_id!));
  revalidateWaiterPaths();
  return { error: null };
}
