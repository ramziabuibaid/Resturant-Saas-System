import { getProfileOrRedirect, getRestaurantForProfile } from "@/app/actions/auth";
import { getCategories, getMenuItems } from "@/app/actions/admin-items";
import { AdminItemsManager } from "@/app/admin/items/admin-items-manager";

export const metadata = {
  title: "أصناف القائمة | لوحة المطعم",
  description: "إدارة أصناف القائمة",
};

export default async function OwnerItemsPage() {
  const profile = await getProfileOrRedirect();
  const restaurantId = profile.restaurant_id!;
  const [categories, items, restaurant] = await Promise.all([
    getCategories(restaurantId),
    getMenuItems(restaurantId),
    getRestaurantForProfile(profile),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">أصناف القائمة</h2>
        <p className="text-muted-foreground">
          إضافة وتعديل وحذف الأصناف، مع دعم السعر الأساسي والعملة الثانية عند التفعيل.
        </p>
      </div>
      <AdminItemsManager
        restaurantId={restaurantId}
        initialCategories={categories}
        initialItems={items}
        secondaryCurrencyEnabled={restaurant?.secondary_currency_enabled === true}
        secondaryCurrencyCode={restaurant?.secondary_currency_code ?? null}
        secondaryExchangeRate={
          restaurant?.secondary_currency_exchange_rate != null
            ? Number(restaurant.secondary_currency_exchange_rate)
            : null
        }
        primaryCurrencyCode={restaurant?.currency_code ?? null}
      />
    </div>
  );
}
