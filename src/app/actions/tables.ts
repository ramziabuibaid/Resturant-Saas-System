"use server";

import { and, asc, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import type { RestaurantTable } from "@/lib/types/database";

function revalidateRestaurantPaths() {
  revalidatePath("/admin/tables");
  revalidatePath("/admin/orders");
}

type TableRow = typeof schema.restaurantTables.$inferSelect;

function toTableDto(t: TableRow): RestaurantTable {
  return {
    id: t.id,
    restaurant_id: t.restaurantId,
    label: t.label,
    public_token: t.publicToken,
    sort_order: t.sortOrder,
    waiter_id: t.waiterId,
    created_at: t.createdAt.toISOString(),
  };
}

export async function listRestaurantTables(): Promise<{
  tables: RestaurantTable[];
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rows = await db
    .select()
    .from(schema.restaurantTables)
    .where(eq(schema.restaurantTables.restaurantId, restaurant_id!))
    .orderBy(asc(schema.restaurantTables.sortOrder), asc(schema.restaurantTables.label));
  return { tables: rows.map(toTableDto), error: null };
}

export async function createRestaurantTable(label: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const restaurantId = restaurant_id!;
  const trimmed = label.trim();
  if (!trimmed) return { error: "اسم الطاولة مطلوب" };
  if (trimmed.length > 60) return { error: "اسم الطاولة طويل جداً" };

  const [{ n }] = await db
    .select({ n: count() })
    .from(schema.restaurantTables)
    .where(eq(schema.restaurantTables.restaurantId, restaurantId));
  await db.insert(schema.restaurantTables).values({ restaurantId, label: trimmed, sortOrder: n + 1 });
  revalidateRestaurantPaths();
  return { error: null };
}

export async function deleteRestaurantTable(tableId: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  await db
    .delete(schema.restaurantTables)
    .where(and(eq(schema.restaurantTables.id, tableId), eq(schema.restaurantTables.restaurantId, restaurant_id!)));
  revalidateRestaurantPaths();
  return { error: null };
}

/** ربط طاولة بويتر (أو إلغاء الربط بـ null) */
export async function setRestaurantTableWaiter(
  tableId: string,
  waiterId: string | null
): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const restaurantId = restaurant_id!;

  if (waiterId) {
    const [w] = await db
      .select({ id: schema.restaurantWaiters.id })
      .from(schema.restaurantWaiters)
      .where(and(eq(schema.restaurantWaiters.id, waiterId), eq(schema.restaurantWaiters.restaurantId, restaurantId)))
      .limit(1);
    if (!w) return { error: "الويتر غير موجود" };
  }

  await db
    .update(schema.restaurantTables)
    .set({ waiterId })
    .where(and(eq(schema.restaurantTables.id, tableId), eq(schema.restaurantTables.restaurantId, restaurantId)));
  revalidateRestaurantPaths();
  return { error: null };
}
