import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRestaurantBySubdomain } from "@/app/actions/menu";
import { resolveAdminTenant } from "@/lib/admin-resolve-tenant";
import {
  getSuperAdminProfileOrRedirectWithLoginMode,
  getProfileForRestaurantAdminOrRedirect,
  getRestaurantForProfile,
} from "@/app/actions/auth";
import { AdminShell } from "./admin-shell";
import { AdminRestaurantShell } from "./admin-restaurant-shell";
import { buildTenantPublicSiteUrl } from "@/lib/tenant-public-url";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await resolveAdminTenant();
  if (!tenant) {
    return {
      title: "لوحة التحكم",
      description: "إدارة النظام أو المطعم",
    };
  }
  const { data: restaurant } = await getRestaurantBySubdomain(tenant.subdomain);
  const logoUrl = restaurant?.logo_url?.trim();
  return {
    title: restaurant ? `لوحة التحكم — ${restaurant.name}` : "لوحة التحكم",
    description: "إدارة النظام أو المطعم",
    ...(logoUrl
      ? {
          icons: {
            icon: logoUrl,
            apple: logoUrl,
          },
        }
      : {}),
  };
}

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
    const built = buildTenantPublicSiteUrl(restaurant.subdomain, host, proto);
    livePreviewUrl = built || null;
  }

  return (
    <AdminRestaurantShell
      restaurantName={restaurant?.name ?? "المطعم"}
      restaurantId={restaurant?.id ?? null}
      livePreviewUrl={livePreviewUrl}
      logoUrl={restaurant?.logo_url ?? null}
      profile={{ name: "صاحب المطعم", role: "owner" }}
    >
      {children}
    </AdminRestaurantShell>
  );
}
