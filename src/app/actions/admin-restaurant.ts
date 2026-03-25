"use server";

import { createClient } from "@/lib/supabase/server";
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

async function assertRestaurantOwner(restaurantId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "غير مسجّل الدخول" as string };

  const { data: profile } = await supabase
    .from("profiles")
    .select("restaurant_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.restaurant_id !== restaurantId) {
    return { supabase, error: "غير مصرح بتعديل هذا المطعم" as string };
  }

  return { supabase, error: null as string | null };
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
  const { supabase, error } = await assertRestaurantOwner(restaurantId);
  if (error) return { error };

  const { error: dbError } = await supabase
    .from("restaurants")
    .update({ logo_url: logoUrl })
    .eq("id", restaurantId);
  if (dbError) return { error: dbError.message };
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
  const { supabase, error } = await assertRestaurantOwner(restaurantId);
  if (error) return { error };

  const { error: dbError } = await supabase
    .from("restaurants")
    .update({
      headline: payload.headline ?? null,
      subheadline: payload.subheadline ?? null,
      hero_background_url: payload.hero_background_url ?? null,
      footer_note: payload.footer_note ?? null,
      public_address: payload.public_address?.trim() ? payload.public_address.trim() : null,
      public_maps_url: normalizeSocialUrl(payload.public_maps_url),
      public_phone_1: payload.public_phone_1?.trim() ? payload.public_phone_1.trim() : null,
      public_phone_2: payload.public_phone_2?.trim() ? payload.public_phone_2.trim() : null,
      public_phone_3: payload.public_phone_3?.trim() ? payload.public_phone_3.trim() : null,
      social_facebook_url: normalizeSocialUrl(payload.social_facebook_url),
      social_instagram_url: normalizeSocialUrl(payload.social_instagram_url),
      social_tiktok_url: normalizeSocialUrl(payload.social_tiktok_url),
      currency_code: payload.currency_code ?? null,
      secondary_currency_enabled: payload.secondary_currency_enabled ?? false,
      secondary_currency_code:
        payload.secondary_currency_enabled === true
          ? payload.secondary_currency_code ?? null
          : null,
      secondary_currency_exchange_rate:
        payload.secondary_currency_enabled === true &&
        typeof payload.secondary_currency_exchange_rate === "number" &&
        Number.isFinite(payload.secondary_currency_exchange_rate) &&
        payload.secondary_currency_exchange_rate > 0
          ? payload.secondary_currency_exchange_rate
          : null,
      menu_title_animation_enabled:
        payload.menu_title_animation_enabled ?? false,
      menu_banner_url: payload.menu_banner_url ?? null,
      menu_banner_kind: payload.menu_banner_kind ?? null,
      menu_banner_caption: payload.menu_banner_caption?.trim()
        ? payload.menu_banner_caption.trim()
        : null,
    })
    .eq("id", restaurantId);

  if (dbError) return { error: dbError.message };

  const { data: row } = await supabase
    .from("restaurants")
    .select("subdomain")
    .eq("id", restaurantId)
    .maybeSingle();

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/owner");
  revalidatePath("/owner/settings");
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
  const { supabase, error } = await assertRestaurantOwner(restaurantId);
  if (error) return { error };

  const spend = Math.floor(payload.loyalty_spend_cents_per_point);
  const val = Math.floor(payload.loyalty_point_value_cents);
  if (spend < 1) {
    return { error: "مبلغ الإنفاق لكسب نقطة يجب أن يعادل 0.01 على الأقل من عملتك" };
  }
  if (val < 1) {
    return { error: "قيمة النقطة يجب أن تعادل 0.01 على الأقل من عملتك" };
  }

  const { error: dbError } = await supabase
    .from("restaurants")
    .update({
      loyalty_program_enabled: payload.loyalty_program_enabled,
      loyalty_spend_cents_per_point: spend,
      loyalty_point_value_cents: val,
    })
    .eq("id", restaurantId);

  if (dbError) return { error: dbError.message };

  revalidatePath("/admin/settings");
  revalidatePath("/owner/settings");
  revalidatePath("/admin/customers");
  revalidatePath("/owner/customers");
  return { error: null };
}

/**
 * مقدمة الدولة لأرقام الزبائن (واتساب / اتصال). أرقام فقط بدون +، مثل 966.
 */
export async function updateRestaurantPhoneCountryPrefix(
  restaurantId: string,
  rawPrefix: string | null
): Promise<{ error: string | null }> {
  const { supabase, error } = await assertRestaurantOwner(restaurantId);
  if (error) return { error };

  const digits = (rawPrefix ?? "").replace(/\D/g, "");
  if (digits.length > 6) {
    return { error: "المقدمة الدولية طويلة جداً (استخدم أرقام الدولة فقط، مثل 966)" };
  }

  const { error: dbError } = await supabase
    .from("restaurants")
    .update({ phone_country_prefix: digits.length ? digits : null })
    .eq("id", restaurantId);

  if (dbError) return { error: dbError.message };

  revalidatePath("/admin/settings");
  revalidatePath("/owner/settings");
  revalidatePath("/admin/orders");
  revalidatePath("/owner/orders");
  return { error: null };
}
