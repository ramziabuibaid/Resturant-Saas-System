import { cache } from "react";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/current-user";
import { resolveAdminTenant } from "@/lib/admin-resolve-tenant";
import type { Profile } from "@/lib/types/database";

/**
 * من يفتح /admin الآن؟ مصدر واحد للحقيقة لكل صفحات لوحة التحكم.
 *
 * - على نطاق مطعم (alking.example.com/admin): يجب أن يكون المستخدم مالك هذا المطعم.
 * - على الدومين الرئيسي (example.com/admin): مالك النظام → لوحة النظام،
 *   وصاحب المطعم → لوحة مطعمه (حسب restaurant_id في ملفه).
 */
export type AdminContext =
  | { kind: "super"; profile: Profile }
  | {
      kind: "restaurant";
      profile: Profile;
      restaurantId: string;
      /** النطاق الفرعي إن فُتحت اللوحة منه، وإلا null */
      tenantSubdomain: string | null;
    };

export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const [profile, tenant] = await Promise.all([getProfile(), resolveAdminTenant()]);
  if (!profile) redirect("/login");

  if (tenant) {
    if (profile.restaurant_id !== tenant.id) redirect("/forbidden");
    return {
      kind: "restaurant",
      profile,
      restaurantId: tenant.id,
      tenantSubdomain: tenant.subdomain,
    };
  }

  if (profile.role === "super_admin") return { kind: "super", profile };
  if (!profile.restaurant_id) redirect("/complete-profile");
  return {
    kind: "restaurant",
    profile,
    restaurantId: profile.restaurant_id,
    tenantSubdomain: null,
  };
});

/** لصفحات لوحة المطعم فقط — مالك النظام يُعاد إلى /admin */
export async function requireRestaurantAdmin() {
  const ctx = await getAdminContext();
  if (ctx.kind !== "restaurant") redirect("/admin");
  return ctx;
}

/** لصفحات لوحة النظام فقط — صاحب المطعم يُعاد إلى /admin */
export async function requireSuperAdmin() {
  const ctx = await getAdminContext();
  if (ctx.kind !== "super") redirect("/admin");
  return ctx;
}
