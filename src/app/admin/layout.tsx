import type { Metadata } from "next";
import { headers } from "next/headers";
import { getRestaurantSummaryBySubdomain as getRestaurantBySubdomain } from "@/lib/data/menu";
import { resolveAdminTenant } from "@/lib/admin-resolve-tenant";
import { getRestaurantForProfile } from "@/lib/data/restaurants";
import { getAdminContext } from "@/lib/admin-context";
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
 * /admin واحد لكل الأدوار — انظر getAdminContext:
 * - مالك النظام على الدومين الرئيسي → لوحة النظام
 * - صاحب المطعم (من نطاقه الفرعي أو من الدومين الرئيسي) → لوحة مطعمه
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAdminContext();
  if (ctx.kind === "super") return <AdminShell>{children}</AdminShell>;

  const { profile } = ctx;
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
