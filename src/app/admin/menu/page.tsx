import { requireRestaurantAdmin } from "@/lib/admin-context";
import { getRestaurantForProfile } from "@/lib/data/restaurants";
import { getCategoriesForRestaurant, getMenuItems } from "@/lib/data/menu";
import { MenuManager } from "./menu-manager";

export const metadata = {
  title: "المنيو | لوحة المطعم",
  description: "إدارة التصنيفات والأصناف",
};

export default async function AdminMenuPage() {
  const { profile } = await requireRestaurantAdmin();
  const restaurantId = profile.restaurant_id!;
  const [categories, items, restaurant] = await Promise.all([
    getCategoriesForRestaurant(restaurantId),
    getMenuItems(restaurantId),
    getRestaurantForProfile(profile),
  ]);
  const rate = restaurant?.secondary_currency_exchange_rate;

  return (
    <MenuManager
      initialCategories={categories}
      initialItems={items}
      currencyCode={restaurant?.currency_code ?? "ILS"}
      currency={{
        secondaryEnabled: restaurant?.secondary_currency_enabled === true && !!restaurant.secondary_currency_code,
        secondaryCode: restaurant?.secondary_currency_code ?? null,
        hasExchangeRate: rate != null && Number(rate) > 0,
      }}
    />
  );
}
