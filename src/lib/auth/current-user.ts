import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import type { Profile } from "@/lib/types/database";

/*
 * من المستخدم الحالي؟ — للخادم فقط (صفحات و actions).
 * يعيد Profile بنفس الشكل القديم حتى لا تتغير بقية الكود.
 */

export function toProfile(u: SessionUser): Profile {
  return {
    id: u.id,
    restaurant_id: u.restaurantId,
    role: u.role,
    username: u.username,
    login_email: u.email,
    full_name: u.fullName,
    created_at: u.createdAt.toISOString(),
    updated_at: u.updatedAt.toISOString(),
  };
}

export async function getProfile(): Promise<Profile | null> {
  const user = await getSessionUser();
  return user ? toProfile(user) : null;
}

/** لـ actions صاحب المطعم: يتطلب جلسة + مطعماً مرتبطاً */
export async function getProfileOrRedirect(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/admin");
  if (!profile.restaurant_id) redirect("/complete-profile");
  return profile;
}

/** كل دالة في ملف "use server" endpoint عام — استدعِ هذا أولاً في actions مالك النظام */
export async function isSuperAdminRequest(): Promise<boolean> {
  const profile = await getProfile();
  return profile?.role === "super_admin";
}

export const UNAUTHORIZED = "غير مصرح لك بهذه العملية";
