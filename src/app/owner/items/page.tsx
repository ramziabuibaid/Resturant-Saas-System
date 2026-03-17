import { getProfileOrRedirect } from "@/app/actions/auth";
import { getCategories, getMenuItems } from "@/app/actions/admin-items";
import { AdminItemsManager } from "@/app/admin/items/admin-items-manager";

export const metadata = {
  title: "أصناف القائمة | لوحة المطعم",
  description: "إدارة أصناف القائمة",
};

export default async function OwnerItemsPage() {
  const profile = await getProfileOrRedirect();
  const restaurantId = profile.restaurant_id!;
  const [categories, items] = await Promise.all([
    getCategories(restaurantId),
    getMenuItems(restaurantId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">أصناف القائمة</h2>
        <p className="text-muted-foreground">
          إضافة وتعديل وحذف الأصناف. السعر بالدولار (مثلاً 50.00).
        </p>
      </div>
      <AdminItemsManager
        restaurantId={restaurantId}
        initialCategories={categories}
        initialItems={items}
      />
    </div>
  );
}
