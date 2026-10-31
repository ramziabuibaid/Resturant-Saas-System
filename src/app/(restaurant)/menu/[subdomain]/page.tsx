import { getMenuItemsBySubdomain } from "@/lib/data/menu";
import { getRestaurantTableByToken, listPublicTablesForRestaurant } from "@/lib/data/tables";
import { notFound } from "next/navigation";
import { MenuView } from "@/components/menu-view";
import { getSubscriptionInfo } from "@/lib/subscription";

type Props = {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{ t?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { subdomain } = await params;
  const { restaurant } = await getMenuItemsBySubdomain(
    decodeURIComponent(subdomain)
  );
  const logoUrl = restaurant?.logo_url?.trim();
  return {
    title: restaurant ? `${restaurant.name} – Menu` : "Menu",
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

export default async function PublicMenuPage({ params, searchParams }: Props) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const decodedSubdomain = decodeURIComponent(subdomain);
  const { restaurant, categories, menuItems } =
    await getMenuItemsBySubdomain(decodedSubdomain);

  if (!restaurant) {
    notFound();
  }

  const sub = getSubscriptionInfo({
    status: restaurant.status,
    plan: restaurant.plan,
    trialEndsAt: restaurant.trial_ends_at,
    paidUntil: restaurant.paid_until,
  });
  if (!sub.canServe) {
    return (
      <main dir="rtl" className="flex min-h-svh flex-col items-center justify-center gap-3 bg-bg-base px-6 text-center">
        <p className="font-display text-2xl font-bold text-text-primary">{restaurant.name}</p>
        <p className="max-w-sm text-text-secondary">المنيو غير متاح حالياً. يرجى المحاولة لاحقاً أو التواصل مع المطعم مباشرة.</p>
      </main>
    );
  }

  // بيانات الاشتراك لا تخص الزبون
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { plan, trial_ends_at, paid_until, ...publicRestaurant } = restaurant;
  if (!sub.features.loyalty) publicRestaurant.loyalty_program_enabled = false;

  const urlToken = typeof sp?.t === "string" ? sp.t : null;
  const tableFromQr = urlToken
    ? await getRestaurantTableByToken(restaurant.id, urlToken)
    : null;
  const publicTables = tableFromQr
    ? []
    : await listPublicTablesForRestaurant(restaurant.id);

  return (
    <MenuView
      restaurant={publicRestaurant}
      orderingEnabled={sub.features.ordering}
      categories={categories ?? []}
      menuItems={menuItems ?? []}
      subdomain={restaurant.subdomain}
      tableFromQr={tableFromQr}
      tableToken={urlToken}
      publicTables={publicTables}
    />
  );
}
