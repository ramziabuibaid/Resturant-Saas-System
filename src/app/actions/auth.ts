"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlaceholderEmail } from "@/lib/placeholder-email";
import type { Profile } from "@/lib/types/database";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const SUBDOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;
const SUBDOMAIN_MIN = 2;
const SUBDOMAIN_MAX = 63;

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

/**
 * Same as getSuperAdminProfileOrRedirect, but controls which login form is shown:
 * - loginMode="username" redirects to /login?mode=username
 * - loginMode="email" redirects to /login?mode=email
 */
export async function getSuperAdminProfileOrRedirectWithLoginMode(
  loginMode: "username" | "email"
): Promise<Profile> {
  const session = await getSession();
  if (!session) redirect(`/login?mode=${loginMode}`);
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

/**
 * بعد تسجيل الزائر بـ (username + password) ننشئ له بروفايلاً باسم المستخدم والبريد الداخلي.
 * يُستدعى من العميل بعد signUp مباشرة.
 */
export async function createProfileAfterSignup(
  username: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "يجب تسجيل الدخول أولاً" };

  const raw = username?.trim();
  if (!raw || raw.length < 3) return { error: "اسم المستخدم 3 أحرف على الأقل" };
  const lower = raw.toLowerCase();
  if (!USERNAME_REGEX.test(lower))
    return { error: "اسم المستخدم: حروف إنجليزية صغيرة، أرقام، شرطة أو شرطة سفلية فقط (3–30 حرفاً)" };

  const login_email = getPlaceholderEmail(raw);
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").upsert(
    {
      id: user.id,
      username: lower,
      login_email,
      role: "owner",
    },
    { onConflict: "id" }
  );
  if (error) return { error: error.message || "فشل إنشاء الملف الشخصي" };
  revalidatePath("/complete-profile");
  return { error: null };
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

/**
 * إنشاء مطعم جديد وربط الحساب به (للزائر الجديد — شهر تجريبي بدون تدخل المالك).
 * يستخدم Admin لتفادي RLS على restaurants و profiles.
 */
export async function createRestaurantAndLink(payload: {
  name: string;
  subdomain: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "يجب تسجيل الدخول أولاً" };

  const name = payload.name?.trim();
  const subRaw = payload.subdomain?.trim().toLowerCase();
  if (!name || name.length < 2) return { error: "اسم المطعم يجب أن يكون حرفين على الأقل" };
  if (!subRaw) return { error: "النطاق الفرعي مطلوب" };
  if (subRaw.length < SUBDOMAIN_MIN || subRaw.length > SUBDOMAIN_MAX)
    return { error: `النطاق الفرعي بين ${SUBDOMAIN_MIN} و ${SUBDOMAIN_MAX} حرفاً` };
  if (!SUBDOMAIN_REGEX.test(subRaw))
    return { error: "النطاق الفرعي: حروف إنجليزية صغيرة، أرقام وشرطة فقط" };

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("restaurants")
    .select("id")
    .ilike("subdomain", subRaw)
    .maybeSingle();
  if (existing) return { error: "النطاق الفرعي مستخدم لمطعم آخر. اختر غيره." };

  const { data: newRestaurant, error: insertErr } = await admin
    .from("restaurants")
    .insert({
      name,
      subdomain: subRaw,
      status: "active",
    })
    .select("id")
    .single();
  if (insertErr) return { error: insertErr.message || "فشل إنشاء المطعم" };
  if (!newRestaurant?.id) return { error: "فشل إنشاء المطعم" };

  const { error: profileErr } = await admin.from("profiles").upsert(
    {
      id: user.id,
      restaurant_id: newRestaurant.id,
      role: "owner",
      login_email: user.email ?? null,
    },
    { onConflict: "id" }
  );
  if (profileErr) return { error: profileErr.message || "فشل ربط الحساب بالمطعم" };

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
    .select(
      "id, name, subdomain, logo_url, headline, subheadline, hero_background_url, footer_note, public_address, public_maps_url, public_phone_1, public_phone_2, public_phone_3, social_facebook_url, social_instagram_url, social_tiktok_url, currency_code, secondary_currency_enabled, secondary_currency_code, secondary_currency_exchange_rate, menu_title_animation_enabled, menu_banner_url, menu_banner_kind, menu_banner_caption, loyalty_program_enabled, loyalty_spend_cents_per_point, loyalty_point_value_cents, phone_country_prefix, waiters_system_enabled"
    )
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

/**
 * تسجيل دخول مالك النظام (super_admin) باسم المستخدم وكلمة المرور عبر الدومين الرئيسي.
 * نستخدم Admin لقراءة login_email لأن RLS تمنع القراءة قبل تسجيل الدخول.
 */
export async function signInSuperAdminWithUsernamePassword(
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const uname = username.trim().toLowerCase();
  if (!uname || !password) return { error: "اسم المستخدم وكلمة المرور مطلوبان" };

  let profile: { login_email: string | null } | null = null;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("login_email")
      .eq("role", "super_admin")
      .eq("username", uname)
      .maybeSingle();
    profile = data;
  } catch {
    return { error: "تسجيل الدخول غير متاح حالياً. تأكد من إعداد SUPABASE_SERVICE_ROLE_KEY." };
  }

  try {
    if (!profile?.login_email) return { error: "لم يتم العثور على super_admin أو login_email غير مضبوط" };

    const supabase = await createClient();
    const resolvedEmail = profile.login_email.trim();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: resolvedEmail,
      password,
    });

    if (signInError) return { error: signInError.message || "فشل تسجيل الدخول" };
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "فشل تسجيل الدخول" };
  }
}

/** Owner dashboard stats: categories, menu items, طلبات قيد الانتظار (إن وُجد جدول الطلبات). */
export async function getOwnerDashboardStats(restaurantId: string): Promise<{
  categoriesCount: number;
  menuItemsCount: number;
  pendingOrdersCount: number;
}> {
  const supabase = await createClient();
  const [catRes, itemsRes] = await Promise.all([
    supabase.from("categories").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("restaurant_id", restaurantId),
  ]);
  let pendingOrdersCount = 0;
  const pendingRes = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("restaurant_id", restaurantId)
    .eq("status", "pending");
  if (!pendingRes.error) pendingOrdersCount = pendingRes.count ?? 0;

  return {
    categoriesCount: catRes.count ?? 0,
    menuItemsCount: itemsRes.count ?? 0,
    pendingOrdersCount,
  };
}
