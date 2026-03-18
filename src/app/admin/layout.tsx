import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAdminTenant } from "@/lib/admin-resolve-tenant";
import {
  getSuperAdminProfileOrRedirectWithLoginMode,
  getProfileForRestaurantAdminOrRedirect,
  getRestaurantForProfile,
} from "@/app/actions/auth";
import { AdminShell } from "./admin-shell";
import { AdminRestaurantShell } from "./admin-restaurant-shell";

export const metadata = {
  title: "لوحة التحكم",
  description: "إدارة النظام أو المطعم",
};

/**
 * توجيه /admin حسب الـ subdomain (حسب SYSTEM_CONTEXT.md):
 * - localhost:3000/admin (بدون subdomain) → لوحة مالك النظام (Super Admin)
 * - almankal.localhost:3000/admin (مع subdomain) → لوحة تحكم المطعم
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await resolveAdminTenant();

  if (!tenant) {
    // بدون subdomain = منطقة Super Admin فقط
    await getSuperAdminProfileOrRedirectWithLoginMode("username");
    return <AdminShell>{children}</AdminShell>;
  }

  // مع subdomain = لوحة تحكم المطعم — التحقق من أن المستخدم مالك هذا المطعم
  const profile = await getProfileForRestaurantAdminOrRedirect(tenant.id);

  const restaurant = await getRestaurantForProfile(profile);
  let livePreviewUrl: string | null = null;
  if (restaurant?.subdomain) {
    const h = await headers();
    const host = h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "http";
    livePreviewUrl = `${proto}://${restaurant.subdomain}.${host}`;
  }

  return (
    <AdminRestaurantShell
      restaurantName={restaurant?.name ?? "المطعم"}
      livePreviewUrl={livePreviewUrl}
      logoUrl={restaurant?.logo_url ?? null}
      profile={{ name: "صاحب المطعم", role: "owner" }}
    >
      {children}
    </AdminRestaurantShell>
  );
}
