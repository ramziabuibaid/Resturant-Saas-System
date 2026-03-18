"use server";

import { ensureEnvLoaded } from "@/lib/load-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

// Supabase يرفض نطاقات مثل `.local` لإرسال رسائل الاسترجاع/التفعيل.
// استخدم نطاقاً صالحاً (placeholder) بدلًا من `owners.local`.
const OWNER_EMAIL_DOMAIN = "owners.example.com";

/** يرجع null إذا كل المتغيرات موجودة، أو اسم المتغير الناقص. */
function getMissingEnv(): string | null {
  ensureEnvLoaded();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url) return "NEXT_PUBLIC_SUPABASE_URL";
  if (!key) return "SUPABASE_SERVICE_ROLE_KEY";
  return null;
}

function hasServiceRoleKey(): boolean {
  return getMissingEnv() === null;
}

/**
 * إنشاء أو تحديث بيانات دخول صاحب المطعم (اسم مستخدم + كلمة مرور).
 * إن وُجد مالك للمطعم سابقاً يُحدَّث فقط اسم المستخدم وكلمة المرور.
 * يُستدعى من لوحة Super Admin فقط (يُفترض التحقق من الصلاحية في الـ layout).
 */
export async function createOrUpdateOwnerCredentials(
  restaurantId: string,
  username: string,
  password: string
): Promise<{ error: string | null }> {
  const uname = username.trim().toLowerCase();
  if (!uname) return { error: "اسم المستخدم مطلوب" };
  if (!password || password.length < 6) return { error: "كلمة المرور 6 أحرف على الأقل" };

  const missing = getMissingEnv();
  if (missing) {
    return {
      error: `إضافة ${missing} في .env.local ثم أعد تشغيل السيرفر (npm run dev).`,
    };
  }
  const admin = createAdminClient();

  // هل يوجد مالك لهذا المطعم؟
  const { data: existing } = await admin
    .from("profiles")
    .select("id, login_email")
    .eq("restaurant_id", restaurantId)
    .eq("role", "owner")
    .maybeSingle();

  if (existing) {
    if (password.length > 0) {
      const { error: updateUserError } = await admin.auth.admin.updateUserById(
        existing.id,
        { password }
      );
      if (updateUserError) return { error: updateUserError.message };
    }

    await admin
      .from("profiles")
      .update({
        username: uname,
        login_email: existing.login_email ?? `owner-${restaurantId}@${OWNER_EMAIL_DOMAIN}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    revalidatePath("/admin");
    revalidatePath("/admin/restaurants");
    return { error: null };
  }

  // إنشاء مستخدم جديد في Auth وربطه بالملف
  const loginEmail = `owner-${restaurantId}@${OWNER_EMAIL_DOMAIN}`;
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
  });
  if (createError) return { error: createError.message };
  if (!newUser.user) return { error: "فشل إنشاء المستخدم" };

  const { error: insertError } = await admin.from("profiles").insert({
    id: newUser.user.id,
    restaurant_id: restaurantId,
    role: "owner",
    username: uname,
    login_email: loginEmail,
  });
  if (insertError) {
    await admin.auth.admin.deleteUser(newUser.user.id);
    return { error: insertError.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}

/**
 * تغيير كلمة مرور صاحب المطعم فقط.
 */
export async function updateOwnerPassword(
  restaurantId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  if (!newPassword || newPassword.length < 6) return { error: "كلمة المرور 6 أحرف على الأقل" };

  const missing = getMissingEnv();
  if (missing) {
    return {
      error: `إضافة ${missing} في .env.local ثم أعد تشغيل السيرفر (npm run dev).`,
    };
  }
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("role", "owner")
    .maybeSingle();
  if (!profile) return { error: "لا يوجد مستخدم مرتبط بهذا المطعم" };

  const { error } = await admin.auth.admin.updateUserById(profile.id, {
    password: newPassword,
  });
  if (error) return { error: error.message };
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}

/**
 * جلب بيانات مالك المطعم (للعرض في لوحة Super Admin).
 */
export async function getOwnerByRestaurantId(restaurantId: string): Promise<{
  username: string | null;
  profileId: string | null;
} | null> {
  if (!hasServiceRoleKey()) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, username")
    .eq("restaurant_id", restaurantId)
    .eq("role", "owner")
    .maybeSingle();
  if (!data) return null;
  return { username: data.username ?? null, profileId: data.id };
}

/**
 * جلب أسماء مستخدمي الدخول لعدة مطاعم دفعة واحدة (لجدول المطاعم).
 */
export async function getOwnersByRestaurantIds(
  restaurantIds: string[]
): Promise<Record<string, string | null>> {
  if (restaurantIds.length === 0) return {};
  if (getMissingEnv() !== null) return Object.fromEntries(restaurantIds.map((id) => [id, null]));
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("profiles")
    .select("restaurant_id, username")
    .eq("role", "owner")
    .in("restaurant_id", restaurantIds);
  const map: Record<string, string | null> = {};
  for (const id of restaurantIds) map[id] = null;
  for (const r of rows ?? []) {
    map[r.restaurant_id] = r.username ?? null;
  }
  return map;
}
