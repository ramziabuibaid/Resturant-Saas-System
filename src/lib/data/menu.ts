import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Category, MenuItem, Restaurant } from "@/lib/types/database";
import { toRestaurantDto } from "@/lib/data/restaurants";

/* قراءات المنيو — للخادم فقط (خارج "use server" عمداً). */

type CategoryRow = typeof schema.categories.$inferSelect;
type MenuItemRow = typeof schema.menuItems.$inferSelect;

export function toCategoryDto(c: CategoryRow): Category {
  return {
    id: c.id,
    restaurant_id: c.restaurantId,
    name: c.name,
    sort_order: c.orderIndex,
    created_at: c.createdAt.toISOString(),
  };
}

export function toMenuItemDto(m: MenuItemRow): MenuItem {
  return {
    id: m.id,
    restaurant_id: m.restaurantId,
    category_id: m.categoryId,
    name: m.name,
    description: m.description,
    price: m.price,
    secondary_price: m.secondaryPrice,
    price_options: m.priceOptions,
    secondary_price_options: m.secondaryPriceOptions,
    calories: m.calories,
    is_meal: m.isMeal,
    image_url: m.imageUrl,
    is_available: m.isAvailable,
    created_at: m.createdAt.toISOString(),
    updated_at: m.updatedAt.toISOString(),
  };
}

export async function getCategoriesForRestaurant(restaurantId: string): Promise<Category[]> {
  const rows = await db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.restaurantId, restaurantId))
    .orderBy(asc(schema.categories.orderIndex), asc(schema.categories.name));
  return rows.map(toCategoryDto);
}

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const rows = await db
    .select()
    .from(schema.menuItems)
    .where(eq(schema.menuItems.restaurantId, restaurantId))
    .orderBy(asc(schema.menuItems.sortOrder), asc(schema.menuItems.name));
  return rows.map(toMenuItemDto);
}

export type MenuItemsResult = {
  restaurant: Restaurant | null;
  categories: Category[];
  menuItems: MenuItem[];
  error: string | null;
};

/** المنيو العام: المطعم + التصنيفات + الأصناف */
export async function getMenuItemsBySubdomain(subdomain: string): Promise<MenuItemsResult> {
  const slug = subdomain.trim().toLowerCase();
  if (!slug) return { restaurant: null, categories: [], menuItems: [], error: "Missing subdomain" };

  const [row] = await db.select().from(schema.restaurants).where(eq(schema.restaurants.subdomain, slug)).limit(1);
  if (!row) return { restaurant: null, categories: [], menuItems: [], error: "Restaurant not found" };

  const [categories, menuItems] = await Promise.all([
    getCategoriesForRestaurant(row.id),
    getMenuItems(row.id),
  ]);
  return { restaurant: toRestaurantDto(row), categories, menuItems, error: null };
}

/** بيانات خفيفة للعنوان والأيقونة (metadata) */
export async function getRestaurantSummaryBySubdomain(
  subdomain: string
): Promise<{ data: Pick<Restaurant, "id" | "name" | "subdomain" | "logo_url"> | null; error: string | null }> {
  const slug = subdomain.trim().toLowerCase();
  if (!slug) return { data: null, error: "Missing subdomain" };
  const [row] = await db
    .select({
      id: schema.restaurants.id,
      name: schema.restaurants.name,
      subdomain: schema.restaurants.subdomain,
      logo_url: schema.restaurants.logoUrl,
    })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.subdomain, slug))
    .limit(1);
  return { data: row ?? null, error: null };
}
