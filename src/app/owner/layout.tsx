import type { Metadata } from "next";
import { headers } from "next/headers";
import { getRestaurantBySubdomain } from "@/app/actions/menu";
import { getProfileOrRedirect, getRestaurantForProfile } from "@/app/actions/auth";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { buildTenantPublicSiteUrl } from "@/lib/tenant-public-url";
import { OwnerShell } from "./owner-shell";

export async function generateMetadata(): Promise<Metadata> {
  const identified = await getIdentifiedRestaurant();
  if (!identified) {
    return {
      title: "لوحة المطعم",
      description: "إدارة القائمة والمطعم",
    };
  }
  const { data: restaurant } = await getRestaurantBySubdomain(identified.subdomain);
  const logoUrl = restaurant?.logo_url?.trim();
  return {
    title: restaurant ? `لوحة المطعم — ${restaurant.name}` : "لوحة المطعم",
    description: "إدارة القائمة والمطعم",
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

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfileOrRedirect();
  const identified = await getIdentifiedRestaurant();
  const profileRestaurant = await getRestaurantForProfile(profile);

  if (identified && profile.restaurant_id !== identified.id) {
    const { redirect } = await import("next/navigation");
    redirect("/owner");
  }

  const restaurantId = profile.restaurant_id!;
  const restaurantName = profileRestaurant?.name ?? "My Restaurant";
  const subdomain = profileRestaurant?.subdomain ?? identified?.subdomain ?? null;

  let livePreviewUrl: string | null = null;
  if (subdomain) {
    const h = await headers();
    const host = h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "http";
    const built = buildTenantPublicSiteUrl(subdomain, host, proto);
    livePreviewUrl = built || null;
  }

  return (
    <OwnerShell
      restaurantName={restaurantName}
      restaurantId={restaurantId}
      subdomain={subdomain}
      livePreviewUrl={livePreviewUrl}
    >
      {children}
    </OwnerShell>
  );
}
