"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type RestaurantPublicContentPayload = {
  headline?: string | null;
  subheadline?: string | null;
  hero_background_url?: string | null;
  footer_note?: string | null;
  currency_code?: string | null;
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
      currency_code: payload.currency_code ?? null,
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
