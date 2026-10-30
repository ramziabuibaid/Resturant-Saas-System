"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getProfile } from "@/lib/auth/current-user";
import { revalidatePath } from "next/cache";

type RestaurantPublicContentPayload = {
  headline?: string | null;
  subheadline?: string | null;
  hero_background_url?: string | null;
  footer_note?: string | null;
  /** عنوان يظهر في فوتر المنيو وصفحة التتبع */
  public_address?: string | null;
  public_maps_url?: string | null;
  public_phone_1?: string | null;
  public_phone_2?: string | null;
  public_phone_3?: string | null;
  social_facebook_url?: string | null;
  social_instagram_url?: string | null;
  social_tiktok_url?: string | null;
  currency_code?: string | null;
  secondary_currency_enabled?: boolean;
  secondary_currency_code?: string | null;
  /** وحدات العملة الثانية لكل 1 وحدة من الأساسية */
  secondary_currency_exchange_rate?: number | null;
  menu_title_animation_enabled?: boolean;
  menu_banner_url?: string | null;
  menu_banner_kind?: "image" | "video" | null;
  menu_banner_caption?: string | null;
};

/**
 * المطعم يُؤخذ من جلسة المستخدم دائماً. معامل restaurantId القادم من المتصفح
 * يجب أن يطابقه (حماية إضافية من أخطاء الواجهة)، لكنه لا يُستعمل في الاستعلام.
 */
async function ownRestaurantId(claimed: string): Promise<{ id: string } | { error: string }> {
  const profile = await getProfile();
  if (!profile) return { error: "غير مسجّل الدخول" };
  if (!profile.restaurant_id || profile.restaurant_id !== claimed) return { error: "غير مصرح بتعديل هذا المطعم" };
  return { id: profile.restaurant_id };
}

async function updateOwn(id: string, patch: Partial<typeof schema.restaurants.$inferInsert>) {
  await db.update(schema.restaurants).set(patch).where(eq(schema.restaurants.id, id));
}

/** روابط الصور: من الرفع المحلي أو صور الموقع أو https فقط */
function cleanAssetUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t || t.length > 2000) return null;
  if (t.startsWith("/uploads/") || t.startsWith("/images/") || /^https:\/\//i.test(t)) return t;
  return null;
}

function normalizeSocialUrl(raw: string | null | undefined): string | null {
  const t = raw?.trim();
  if (!t) return null;
  if (t.length > 2000) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

/**
 * تحديث شعار المطعم (لصاحب المطعم فقط — يتحقق من أن profile.restaurant_id = restaurantId).
 */
export async function updateRestaurantLogo(
  restaurantId: string,
  logoUrl: string | null
): Promise<{ error: string | null }> {
  const own = await ownRestaurantId(restaurantId);
  if ("error" in own) return own;
  await updateOwn(own.id, { logoUrl: cleanAssetUrl(logoUrl) });
  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  return { error: null };
}

/**
 * تحديث محتوى الصفحة العامة للمطعم (نصوص الهيرو + الفوتر).
 */
export async function updateRestaurantPublicContent(
  restaurantId: string,
  payload: RestaurantPublicContentPayload
): Promise<{ error: string | null }> {
  const own = await ownRestaurantId(restaurantId);
  if ("error" in own) return own;

  const t = (v: string | null | undefined) => (v?.trim() ? v.trim() : null);
  const rate = payload.secondary_currency_exchange_rate;
  const secondaryOn = payload.secondary_currency_enabled === true;
  const [row] = await db
    .update(schema.restaurants)
    .set({
      headline: t(payload.headline),
      subheadline: t(payload.subheadline),
      heroBackgroundUrl: cleanAssetUrl(payload.hero_background_url),
      footerNote: t(payload.footer_note),
      publicAddress: t(payload.public_address),
      publicMapsUrl: normalizeSocialUrl(payload.public_maps_url),
      publicPhone1: t(payload.public_phone_1),
      publicPhone2: t(payload.public_phone_2),
      publicPhone3: t(payload.public_phone_3),
      socialFacebookUrl: normalizeSocialUrl(payload.social_facebook_url),
      socialInstagramUrl: normalizeSocialUrl(payload.social_instagram_url),
      socialTiktokUrl: normalizeSocialUrl(payload.social_tiktok_url),
      ...(payload.currency_code?.trim() ? { currencyCode: payload.currency_code.trim().toUpperCase() } : {}),
      secondaryCurrencyEnabled: secondaryOn,
      secondaryCurrencyCode: secondaryOn ? t(payload.secondary_currency_code) : null,
      secondaryCurrencyExchangeRate:
        secondaryOn && typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? String(rate) : null,
      menuTitleAnimationEnabled: payload.menu_title_animation_enabled ?? false,
      menuBannerUrl: cleanAssetUrl(payload.menu_banner_url),
      menuBannerKind:
        payload.menu_banner_kind === "image" || payload.menu_banner_kind === "video" ? payload.menu_banner_kind : null,
      menuBannerCaption: t(payload.menu_banner_caption),
    })
    .where(eq(schema.restaurants.id, own.id))
    .returning({ subdomain: schema.restaurants.subdomain });

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  if (row?.subdomain) {
    revalidatePath(`/menu/${row.subdomain}`);
  }
  return { error: null };
}

type LoyaltySettingsPayload = {
  loyalty_program_enabled: boolean;
  loyalty_spend_cents_per_point: number;
  loyalty_point_value_cents: number;
};

/**
 * إعدادات برنامج النقاط: مبلغ الإنفاق لكسب نقطة واحدة، وقيمة النقطة عند الخصم (بالسنت).
 */
export async function updateRestaurantLoyaltySettings(
  restaurantId: string,
  payload: LoyaltySettingsPayload
): Promise<{ error: string | null }> {
  const own = await ownRestaurantId(restaurantId);
  if ("error" in own) return own;

  const spend = Math.floor(payload.loyalty_spend_cents_per_point);
  const val = Math.floor(payload.loyalty_point_value_cents);
  if (!Number.isFinite(spend) || !Number.isFinite(val) || spend > 100_000_000 || val > 100_000_000) {
    return { error: "قيم النقاط غير صالحة" };
  }
  if (spend < 1) {
    return { error: "مبلغ الإنفاق لكسب نقطة يجب أن يعادل 0.01 على الأقل من عملتك" };
  }
  if (val < 1) {
    return { error: "قيمة النقطة يجب أن تعادل 0.01 على الأقل من عملتك" };
  }

  await updateOwn(own.id, {
    loyaltyProgramEnabled: payload.loyalty_program_enabled === true,
    loyaltySpendCentsPerPoint: spend,
    loyaltyPointValueCents: val,
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/customers");
  return { error: null };
}

/**
 * مقدمة الدولة لأرقام الزبائن (واتساب / اتصال). أرقام فقط بدون +، مثل 966.
 */
export async function updateRestaurantPhoneCountryPrefix(
  restaurantId: string,
  rawPrefix: string | null
): Promise<{ error: string | null }> {
  const own = await ownRestaurantId(restaurantId);
  if ("error" in own) return own;

  const digits = (rawPrefix ?? "").replace(/\D/g, "");
  if (digits.length > 6) {
    return { error: "المقدمة الدولية طويلة جداً (استخدم أرقام الدولة فقط، مثل 966)" };
  }

  await updateOwn(own.id, { phoneCountryPrefix: digits.length ? digits : null });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/orders");
  return { error: null };
}
