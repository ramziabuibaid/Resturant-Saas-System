"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type RestaurantPublicContentPayload = {
  headline?: string | null;
  subheadline?: string | null;
  hero_background_url?: string | null;
  footer_note?: string | null;
  currency_code?: string | null;
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
    })
    .eq("id", restaurantId);

  if (dbError) return { error: dbError.message };

  revalidatePath("/admin");
  revalidatePath("/admin/settings");
  revalidatePath("/");
  revalidatePath("/");
  return { error: null };
}
