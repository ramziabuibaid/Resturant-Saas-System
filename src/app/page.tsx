import { headers } from "next/headers";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getRestaurantBySubdomain } from "@/app/actions/auth";
import { getMenuItemsBySubdomain } from "@/app/actions/menu";
import {
  getRestaurantTableByToken,
  listPublicTablesForRestaurant,
} from "@/app/actions/orders";
import { MenuView } from "@/components/menu-view";
import { LandingPage } from "@/components/landing/landing-page";

function subdomainFromHost(host: string): string | null {
  const withoutPort = host.split(":")[0].trim().toLowerCase();
  const parts = withoutPort.split(".");
  const first = parts[0];
  if (parts.length >= 2 && first && first !== "www" && first !== "app" && first !== "localhost")
    return first;
  return null;
}

/** استنتاج المطعم من الهيدرات أو من الـ host (مثل almankal.localhost). */
async function resolveTenant(): Promise<{ id: string; subdomain: string } | null> {
  let tenant = await getIdentifiedRestaurant();
  if (tenant) return tenant;
  const h = await headers();
  const host = h.get("x-original-host") ?? h.get("host") ?? "";
  const sub = subdomainFromHost(host);
  if (sub) tenant = await getRestaurantBySubdomain(sub);
  return tenant;
}

export async function generateMetadata() {
  const identified = await resolveTenant();
  if (identified) {
    const { restaurant } = await getMenuItemsBySubdomain(identified.subdomain);
    if (restaurant) return { title: `${restaurant.name} – Menu` };
  }
  return {
    title: "منيو — منصة استضافة المطاعم والمنيو الرقمي",
    description:
      "منيو مطعمك على الهواء. كود QR واحد، لوحة تحكم، وصفحة منيو للزبائن. خطط من الأساسية إلى السلاسل.",
  };
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const identified = await resolveTenant();
  const sp = await searchParams;

  if (identified) {
    const { restaurant, categories, menuItems } =
      await getMenuItemsBySubdomain(identified.subdomain);
    if (restaurant) {
      const urlToken = typeof sp?.t === "string" ? sp.t : null;
      const tableFromQr = urlToken
        ? await getRestaurantTableByToken(restaurant.id, urlToken)
        : null;
      const publicTables = tableFromQr
        ? []
        : await listPublicTablesForRestaurant(restaurant.id);
      return (
        <MenuView
          restaurant={restaurant}
          categories={categories ?? []}
          menuItems={menuItems ?? []}
          subdomain={restaurant.subdomain}
          tableFromQr={tableFromQr}
          tableToken={urlToken}
          publicTables={publicTables}
        />
      );
    }
  }

  return <LandingPage />;
}
