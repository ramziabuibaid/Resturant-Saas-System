"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types/database";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const SUPER_ADMIN_ROLE = "super_admin";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  return data as Profile;
}

/** For /owner (restaurant owner): requires session + profile with restaurant_id. Redirects super_admin to /admin. */
export async function getProfileOrRedirect(): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/complete-profile");
  if (profile.role === SUPER_ADMIN_ROLE) redirect("/admin");
  if (!profile.restaurant_id) redirect("/complete-profile");
  return profile;
}

/** For /admin (system owner): requires session + profile with role = 'super_admin'. */
export async function getSuperAdminProfileOrRedirect(): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await getProfile();
  if (!profile || profile.role !== SUPER_ADMIN_ROLE) redirect("/owner");
  return profile;
}

/** For /admin on subdomain (restaurant owner): requires session + profile with restaurant_id = tenantId. */
export async function getProfileForRestaurantAdminOrRedirect(
  tenantId: string
): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect("/login");
  const profile = await getProfile();
  if (!profile) redirect("/complete-profile");
  if (profile.role === SUPER_ADMIN_ROLE) redirect("/admin");
  if (profile.restaurant_id !== tenantId) redirect("/admin");
  return profile;
}

export async function isSuperAdmin(profile: Profile | null): Promise<boolean> {
  return profile?.role === SUPER_ADMIN_ROLE;
}

export async function setProfileRestaurant(
  restaurantId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      restaurant_id: restaurantId,
      role: "owner",
    },
    { onConflict: "id" }
  );
  if (error) return { error: error.message };
  revalidatePath("/owner");
  revalidatePath("/complete-profile");
  return { error: null };
}

/** جلب المطعم حسب النطاق الفرعي (للاستخدام في صفحة تسجيل الدخول). */
export async function getRestaurantBySubdomain(
  subdomain: string
): Promise<{ id: string; subdomain: string } | null> {
  const key = subdomain.trim().toLowerCase();
  if (!key) return null;
  // محاولة باستخدام Admin أولاً (تجاوز RLS) حتى يعمل تسجيل الدخول بدون جلسة
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("restaurants")
      .select("id, subdomain")
      .ilike("subdomain", key)
      .maybeSingle();
    if (!error && data) return { id: data.id, subdomain: data.subdomain };
  } catch {
    // إن لم يتوفر Admin (مثلاً عدم وجود SERVICE_ROLE_KEY) نستخدم العميل العادي
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, subdomain")
    .ilike("subdomain", key)
    .maybeSingle();
  if (error || !data) return null;
  return { id: data.id, subdomain: data.subdomain };
}

export async function getRestaurantForProfile(profile: Profile) {
  if (!profile.restaurant_id) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id, name, subdomain, logo_url, headline, subheadline, hero_background_url, footer_note, currency_code")
    .eq("id", profile.restaurant_id)
    .single();
  return data;
}

/**
 * تسجيل دخول صاحب المطعم باسم المستخدم وكلمة المرور (عبر الدومين الفرعي).
 * يستخدم restaurantId من الـ headers (يُستدعى من صفحة /login على الساب دومين).
 * نستخدم Admin لقراءة login_email لأن RLS تمنع القراءة قبل تسجيل الدخول.
 */
export async function signInWithUsernamePassword(
  restaurantId: string,
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const uname = username.trim().toLowerCase();
  if (!uname || !password) return { error: "اسم المستخدم وكلمة المرور مطلوبان" };

  let profile: { login_email: string } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("login_email")
      .eq("restaurant_id", restaurantId)
      .eq("role", "owner")
      .eq("username", uname)
      .maybeSingle();
    profile = data;
  } catch {
    return { error: "تسجيل الدخول غير متاح حالياً. تأكد من إعداد SUPABASE_SERVICE_ROLE_KEY." };
  }

  if (!profile?.login_email) return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: profile.login_email,
    password,
  });
  if (signInError) return { error: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  return { error: null };
}

/** Owner dashboard stats: categories count, menu items count (placeholder for sales until orders exist). */
export async function getOwnerDashboardStats(restaurantId: string): Promise<{
  categoriesCount: number;
  menuItemsCount: number;
}> {
  const supabase = await createClient();
  const [catRes, itemsRes] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
  ]);
  return {
    categoriesCount: catRes.count ?? 0,
    menuItemsCount: itemsRes.count ?? 0,
  };
}
