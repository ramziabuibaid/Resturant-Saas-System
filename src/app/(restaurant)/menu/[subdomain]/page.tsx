import { getMenuItemsBySubdomain } from "@/app/actions/menu";
import {
  getRestaurantTableByToken,
  listPublicTablesForRestaurant,
} from "@/app/actions/orders";
import { notFound } from "next/navigation";
import { MenuView } from "@/components/menu-view";

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
