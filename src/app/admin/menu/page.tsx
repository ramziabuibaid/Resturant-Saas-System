import { redirect } from "next/navigation";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getProfileForRestaurantAdminOrRedirect } from "@/app/actions/auth";
import { getCategories, getMenuItems } from "@/app/actions/admin-items";
import { AdminItemsManager } from "@/app/admin/items/admin-items-manager";

export const metadata = {
  title: "أصناف المنيو | لوحة المطعم",
  description: "إدارة أصناف المنيو",
};

/** صفحة لوحة المطعم فقط — عند الدخول بدون subdomain نوجّه إلى /admin */
export default async function AdminMenuPage() {
  const tenant = await getIdentifiedRestaurant();
  if (!tenant) redirect("/admin");

  const profile = await getProfileForRestaurantAdminOrRedirect(tenant.id);
  const restaurantId = profile.restaurant_id!;
  const [categories, items] = await Promise.all([
    getCategories(restaurantId),
    getMenuItems(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[32px] font-bold leading-tight text-[var(--text-primary)]">
          أصناف المنيو
        </h1>
      </div>
      <AdminItemsManager
        restaurantId={restaurantId}
        initialCategories={categories}
        initialItems={items}
      />
    </div>
  );
}
