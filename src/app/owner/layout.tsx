import { headers } from "next/headers";
import { getProfileOrRedirect, getRestaurantForProfile } from "@/app/actions/auth";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { OwnerShell } from "./owner-shell";

export const metadata = {
  title: "لوحة المطعم",
  description: "إدارة القائمة والمطعم",
};

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
    livePreviewUrl = `${proto}://${subdomain}.${host}`;
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
