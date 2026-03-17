import Link from "next/link";
import { headers } from "next/headers";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getRestaurantBySubdomain } from "@/app/actions/auth";
import { getMenuItemsBySubdomain } from "@/app/actions/menu";
import { MenuView } from "@/components/menu-view";
import { SubdomainRedirect } from "@/components/subdomain-redirect";

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
  return { title: "Restaurant SaaS" };
}

export default async function Home() {
  const identified = await resolveTenant();

  if (identified) {
    const { restaurant, categories, menuItems } =
      await getMenuItemsBySubdomain(identified.subdomain);
    if (restaurant) {
      return (
        <MenuView
          restaurant={restaurant}
          categories={categories ?? []}
          menuItems={menuItems ?? []}
        />
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4">
      <SubdomainRedirect />
      <main className="w-full max-w-xl space-y-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">
          Restaurant SaaS
        </h1>
        <p className="text-stone-600">
          Visit a restaurant subdomain to see its menu (e.g.{" "}
          <code className="rounded bg-stone-200 px-1.5 py-0.5 text-sm">
            pizza-place.yourdomain.com
          </code>
          ). On localhost, try{" "}
          <Link
            href="http://pizza-place.localhost:3000"
            className="font-medium text-stone-800 underline"
          >
            pizza-place.localhost:3000
          </Link>{" "}
          or{" "}
          <Link
            href="http://albaraka.localhost:3000"
            className="font-medium text-stone-800 underline"
          >
            albaraka.localhost:3000
          </Link>
          .
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/menu/pizza-place"
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700"
          >
            View sample menu (pizza-place)
          </Link>
          <Link
            href="/menu/albaraka"
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            View menu (albaraka)
          </Link>
        </div>
      </main>
    </div>
  );
}
