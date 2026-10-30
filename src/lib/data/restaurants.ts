import { and, count, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Profile, Restaurant } from "@/lib/types/database";

/*
 * قراءات المطاعم — للخادم فقط. عمداً ليست في ملف "use server":
 * الدوال هنا تأخذ معرّفات من المستدعي، ولو صارت actions لأمكن لأي زائر استدعاؤها.
 */

type RestaurantRow = typeof schema.restaurants.$inferSelect;

/** صف قاعدة البيانات ← الشكل الذي تتوقعه الواجهة (snake_case) */
export function toRestaurantDto(r: RestaurantRow): Restaurant {
  return {
    id: r.id,
    name: r.name,
    subdomain: r.subdomain,
    status: r.status,
    logo_url: r.logoUrl,
    headline: r.headline,
    subheadline: r.subheadline,
    hero_background_url: r.heroBackgroundUrl,
    footer_note: r.footerNote,
    public_address: r.publicAddress,
    public_maps_url: r.publicMapsUrl,
    public_phone_1: r.publicPhone1,
    public_phone_2: r.publicPhone2,
    public_phone_3: r.publicPhone3,
    social_facebook_url: r.socialFacebookUrl,
    social_instagram_url: r.socialInstagramUrl,
    social_tiktok_url: r.socialTiktokUrl,
    currency_code: r.currencyCode,
    secondary_currency_enabled: r.secondaryCurrencyEnabled,
    secondary_currency_code: r.secondaryCurrencyCode,
    secondary_currency_exchange_rate:
      r.secondaryCurrencyExchangeRate == null ? null : Number(r.secondaryCurrencyExchangeRate),
    menu_title_animation_enabled: r.menuTitleAnimationEnabled,
    menu_banner_url: r.menuBannerUrl,
    menu_banner_kind: r.menuBannerKind,
    menu_banner_caption: r.menuBannerCaption,
    loyalty_program_enabled: r.loyaltyProgramEnabled,
    loyalty_spend_cents_per_point: r.loyaltySpendCentsPerPoint,
    loyalty_point_value_cents: r.loyaltyPointValueCents,
    phone_country_prefix: r.phoneCountryPrefix,
    waiters_system_enabled: r.waitersSystemEnabled,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const [row] = await db.select().from(schema.restaurants).where(eq(schema.restaurants.id, id)).limit(1);
  return row ? toRestaurantDto(row) : null;
}

/** مطعم صاحب الحساب (أو null لمالك النظام) */
export async function getRestaurantForProfile(profile: Pick<Profile, "restaurant_id">) {
  return profile.restaurant_id ? getRestaurantById(profile.restaurant_id) : null;
}

export async function getRestaurantBySubdomain(
  subdomain: string
): Promise<{ id: string; subdomain: string } | null> {
  const key = subdomain.trim().toLowerCase();
  if (!key) return null;
  const [row] = await db
    .select({ id: schema.restaurants.id, subdomain: schema.restaurants.subdomain })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.subdomain, key))
    .limit(1);
  return row ?? null;
}

/** للـ proxy: البحث بالنطاق الفرعي أو بالدومين الخاص */
export async function findRestaurantByHost(
  by: { subdomain: string } | { customDomain: string }
): Promise<{ id: string; subdomain: string; logo_url: string | null } | null> {
  const where =
    "subdomain" in by
      ? eq(schema.restaurants.subdomain, by.subdomain.toLowerCase())
      : eq(schema.restaurants.customDomain, by.customDomain.toLowerCase());
  const [row] = await db
    .select({
      id: schema.restaurants.id,
      subdomain: schema.restaurants.subdomain,
      logo_url: schema.restaurants.logoUrl,
    })
    .from(schema.restaurants)
    .where(where)
    .limit(1);
  return row ?? null;
}

export async function getOwnerDashboardStats(restaurantId: string) {
  const [[cats], [items], [pending]] = await Promise.all([
    db.select({ n: count() }).from(schema.categories).where(eq(schema.categories.restaurantId, restaurantId)),
    db.select({ n: count() }).from(schema.menuItems).where(eq(schema.menuItems.restaurantId, restaurantId)),
    db
      .select({ n: count() })
      .from(schema.orders)
      .where(and(eq(schema.orders.restaurantId, restaurantId), eq(schema.orders.status, "pending"))),
  ]);
  return {
    categoriesCount: cats.n,
    menuItemsCount: items.n,
    pendingOrdersCount: pending.n,
  };
}

export async function isSubdomainTaken(subdomain: string, exceptRestaurantId?: string) {
  const rows = await db
    .select({ id: schema.restaurants.id })
    .from(schema.restaurants)
    .where(
      exceptRestaurantId
        ? and(
            eq(schema.restaurants.subdomain, subdomain),
            sql`${schema.restaurants.id} <> ${exceptRestaurantId}`
          )
        : eq(schema.restaurants.subdomain, subdomain)
    )
    .limit(1);
  return rows.length > 0;
}

export const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
export const SUBDOMAIN_MIN = 2;
export const SUBDOMAIN_MAX = 63;
/** نطاقات محجوزة للمنصة نفسها */
export const RESERVED_SUBDOMAINS = new Set(["www", "app", "admin", "api", "mail", "static", "assets"]);

export function validateSubdomain(raw: string): { value: string } | { error: string } {
  const value = raw.trim().toLowerCase().replace(/\s+/g, "-");
  if (!value) return { error: "النطاق الفرعي مطلوب" };
  if (value.length < SUBDOMAIN_MIN || value.length > SUBDOMAIN_MAX)
    return { error: `النطاق الفرعي بين ${SUBDOMAIN_MIN} و ${SUBDOMAIN_MAX} حرفاً` };
  if (!SUBDOMAIN_REGEX.test(value)) return { error: "النطاق الفرعي: حروف إنجليزية صغيرة، أرقام وشرطة فقط" };
  if (RESERVED_SUBDOMAINS.has(value)) return { error: "هذا النطاق محجوز، اختر غيره" };
  return { value };
}
