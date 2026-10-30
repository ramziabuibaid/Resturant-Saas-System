import { headers } from "next/headers";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getRestaurantBySubdomain } from "@/lib/data/restaurants";
import { getMenuItemsBySubdomain } from "@/lib/data/menu";
import { getRestaurantTableByToken, listPublicTablesForRestaurant } from "@/lib/data/tables";
import { MenuView } from "@/components/menu-view";
import { LandingPage } from "@/components/landing/landing-page";
import { getRootDomain, subdomainFromHost } from "@/lib/tenant-host";

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
    title: "منيو — منيو رقمي وطلب من الطاولة لمطعمك",
    description:
      "الزبون يمسح رمز QR، يتصفح أطباقك بالصور، ويرسل طلبه إلى لوحتك. نقاط ولاء ولوحة تحكم عربية. أول شهر مجاناً.",
    openGraph: {
      title: "منيو — منيو رقمي وطلب من الطاولة",
      description: "منيو رقمي بكود QR، طلب من الطاولة، ونقاط ولاء لمطعمك.",
      images: [{ url: "/images/landing/og-base.png", width: 1376, height: 768 }],
      locale: "ar",
      type: "website",
    },
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

  // رابط المنيو التجريبي: demo.<الدومين الحالي> (محلياً demo.localhost:PORT)
  const h = await headers();
  const host = (h.get("x-forwarded-host") ?? h.get("host") ?? "").replace(/^www\./, "");
  const demoUrl = host.includes("localhost")
    ? `http://demo.${host}`
    : `https://demo.${getRootDomain() ?? host}`;
  return <LandingPage demoUrl={demoUrl} />;
}
