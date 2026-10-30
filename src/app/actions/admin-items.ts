"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import { toMenuItemDto } from "@/lib/data/menu";
import type { MenuItem, PriceOption } from "@/lib/types/database";

/*
 * المطعم يُؤخذ دائماً من جلسة المستخدم — restaurant_id القادم من المتصفح يُتجاهل.
 */

export type CreateMenuItemInput = {
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  secondary_price?: number | null;
  category_id: string | null;
  image_url: string | null;
  is_available?: boolean;
  /** خيارات أسعار حسب الحجم/الوزن (نفر، نصف كيلو، كيلو، صغير، وسط، كبير...) */
  price_options?: PriceOption[] | null;
  /** نفس الخيارات للعملة الثانية عند التفعيل */
  secondary_price_options?: PriceOption[] | null;
};

export type UpdateMenuItemInput = Partial<Omit<CreateMenuItemInput, "restaurant_id">>;

function revalidateMenu() {
  revalidatePath("/admin/menu");
  revalidatePath("/admin");
}

function isValidCents(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 100_000_000;
}

function cleanOptions(opts: PriceOption[] | null | undefined): PriceOption[] | null | "invalid" {
  if (opts == null) return null;
  if (!Array.isArray(opts)) return "invalid";
  if (opts.length === 0) return null;
  const out = opts.map((o) => ({ label: String(o.label ?? "").trim(), price_cents: o.price_cents }));
  if (out.some((o) => !o.label || !isValidCents(o.price_cents))) return "invalid";
  return out;
}

/** التصنيف يجب أن يتبع نفس المطعم */
async function categoryBelongs(categoryId: string | null | undefined, restaurantId: string) {
  if (!categoryId) return true;
  const [c] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.id, categoryId), eq(schema.categories.restaurantId, restaurantId)))
    .limit(1);
  return Boolean(c);
}

/**
 * عند تفعيل العملة الثانية بدون سعر صرف، يجب إدخال أسعارها يدوياً.
 */
async function checkSecondaryPrices(
  restaurantId: string,
  primaryOptions: PriceOption[] | null,
  secondaryOptions: PriceOption[] | null | undefined,
  secondaryPrice: number | null | undefined
): Promise<string | null> {
  const [r] = await db
    .select({
      enabled: schema.restaurants.secondaryCurrencyEnabled,
      rate: schema.restaurants.secondaryCurrencyExchangeRate,
    })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, restaurantId))
    .limit(1);
  const rate = r?.rate == null ? NaN : Number(r.rate);
  if (!r?.enabled || (Number.isFinite(rate) && rate > 0)) return null;

  if (primaryOptions?.length) {
    if (secondaryOptions !== undefined && (!secondaryOptions || secondaryOptions.length !== primaryOptions.length))
      return "عند عدم ضبط سعر الصرف في الإعدادات يجب إدخال أسعار العملة الثانية لكل الأحجام.";
  } else if (secondaryPrice !== undefined && secondaryPrice !== null && !isValidCents(secondaryPrice)) {
    return "سعر العملة الثانية غير صالح.";
  }
  return null;
}

export async function createMenuItem(
  input: CreateMenuItemInput
): Promise<{ data: MenuItem | null; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const restaurantId = restaurant_id!;

  const name = input.name?.trim();
  if (!name) return { data: null, error: "اسم الصنف مطلوب" };
  if (!isValidCents(input.price)) return { data: null, error: "السعر غير صالح" };
  const priceOptions = cleanOptions(input.price_options);
  const secondaryOptions = cleanOptions(input.secondary_price_options);
  if (priceOptions === "invalid" || secondaryOptions === "invalid")
    return { data: null, error: "أسعار الأحجام غير صالحة" };
  if (!(await categoryBelongs(input.category_id, restaurantId))) return { data: null, error: "التصنيف غير صالح" };

  const secondaryError = await checkSecondaryPrices(
    restaurantId,
    priceOptions,
    secondaryOptions,
    input.secondary_price ?? null
  );
  if (secondaryError) return { data: null, error: secondaryError };

  const [row] = await db
    .insert(schema.menuItems)
    .values({
      restaurantId,
      name,
      description: input.description?.trim() || null,
      price: input.price,
      secondaryPrice: input.secondary_price ?? null,
      categoryId: input.category_id || null,
      imageUrl: input.image_url || null,
      isAvailable: input.is_available ?? true,
      priceOptions,
      secondaryPriceOptions: secondaryOptions,
    })
    .returning();

  revalidateMenu();
  return { data: toMenuItemDto(row), error: null };
}

export async function updateMenuItem(
  id: string,
  input: UpdateMenuItemInput
): Promise<{ data: MenuItem | null; error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const restaurantId = restaurant_id!;
  const own = and(eq(schema.menuItems.id, id), eq(schema.menuItems.restaurantId, restaurantId));

  const [existing] = await db.select().from(schema.menuItems).where(own).limit(1);
  if (!existing) return { data: null, error: "الصنف غير موجود." };

  const patch: Partial<typeof schema.menuItems.$inferInsert> = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) return { data: null, error: "اسم الصنف مطلوب" };
    patch.name = name;
  }
  if (input.description !== undefined) patch.description = input.description?.trim() || null;
  if (input.price !== undefined) {
    if (!isValidCents(input.price)) return { data: null, error: "السعر غير صالح" };
    patch.price = input.price;
  }
  if (input.secondary_price !== undefined) patch.secondaryPrice = input.secondary_price;
  if (input.category_id !== undefined) {
    if (!(await categoryBelongs(input.category_id, restaurantId))) return { data: null, error: "التصنيف غير صالح" };
    patch.categoryId = input.category_id || null;
  }
  if (input.image_url !== undefined) patch.imageUrl = input.image_url || null;
  if (input.is_available !== undefined) patch.isAvailable = input.is_available;
  if (input.price_options !== undefined) {
    const opts = cleanOptions(input.price_options);
    if (opts === "invalid") return { data: null, error: "أسعار الأحجام غير صالحة" };
    patch.priceOptions = opts;
  }
  if (input.secondary_price_options !== undefined) {
    const opts = cleanOptions(input.secondary_price_options);
    if (opts === "invalid") return { data: null, error: "أسعار الأحجام غير صالحة" };
    patch.secondaryPriceOptions = opts;
  }

  const secondaryError = await checkSecondaryPrices(
    restaurantId,
    patch.priceOptions !== undefined ? patch.priceOptions ?? null : existing.priceOptions,
    input.secondary_price_options,
    input.secondary_price
  );
  if (secondaryError) return { data: null, error: secondaryError };

  const [row] = await db.update(schema.menuItems).set(patch).where(own).returning();
  revalidateMenu();
  return { data: toMenuItemDto(row), error: null };
}

export async function deleteMenuItem(id: string): Promise<{ error: string | null }> {
  const { restaurant_id } = await getProfileOrRedirect();
  const deleted = await db
    .delete(schema.menuItems)
    .where(and(eq(schema.menuItems.id, id), eq(schema.menuItems.restaurantId, restaurant_id!)))
    .returning({ id: schema.menuItems.id });
  if (!deleted.length) return { error: "الصنف غير موجود." };
  revalidateMenu();
  return { error: null };
}
