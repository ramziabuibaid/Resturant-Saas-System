import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/* قراءات الطاولات للمنيو العام — للخادم فقط. */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** الطاولة من رمز QR (?t=...) */
export async function getRestaurantTableByToken(
  restaurantId: string,
  token: string | null | undefined
): Promise<{ id: string; label: string } | null> {
  const t = token?.trim();
  if (!t || !UUID_RE.test(t)) return null;
  const [row] = await db
    .select({ id: schema.restaurantTables.id, label: schema.restaurantTables.label })
    .from(schema.restaurantTables)
    .where(and(eq(schema.restaurantTables.restaurantId, restaurantId), eq(schema.restaurantTables.publicToken, t)))
    .limit(1);
  return row ?? null;
}

/** قائمة الطاولات ليختار الزبون طاولته عند الطلب بدون QR */
export async function listPublicTablesForRestaurant(restaurantId: string): Promise<{ id: string; label: string }[]> {
  return db
    .select({ id: schema.restaurantTables.id, label: schema.restaurantTables.label })
    .from(schema.restaurantTables)
    .where(eq(schema.restaurantTables.restaurantId, restaurantId))
    .orderBy(asc(schema.restaurantTables.sortOrder), asc(schema.restaurantTables.label));
}
