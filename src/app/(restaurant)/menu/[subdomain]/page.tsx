import { getMenuItemsBySubdomain } from "@/app/actions/menu";
import { notFound } from "next/navigation";
import { MenuView } from "@/components/menu-view";

type Props = {
  params: Promise<{ subdomain: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { subdomain } = await params;
  const { restaurant } = await getMenuItemsBySubdomain(
    decodeURIComponent(subdomain)
  );
  return {
    title: restaurant ? `${restaurant.name} – Menu` : "Menu",
  };
}

export default async function PublicMenuPage({ params }: Props) {
  const { subdomain } = await params;
  const decodedSubdomain = decodeURIComponent(subdomain);
  const { restaurant, categories, menuItems } =
    await getMenuItemsBySubdomain(decodedSubdomain);

  if (!restaurant) {
    notFound();
  }

  return (
    <MenuView
      restaurant={restaurant}
      categories={categories ?? []}
      menuItems={menuItems ?? []}
    />
  );
}
