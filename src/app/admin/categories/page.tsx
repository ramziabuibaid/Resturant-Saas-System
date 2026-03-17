import { redirect } from "next/navigation";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getProfileForRestaurantAdminOrRedirect } from "@/app/actions/auth";
import { getCategoriesForRestaurant } from "@/app/actions/admin-categories";
import { CategoriesManager } from "@/app/admin/categories/categories-manager";

export const metadata = {
  title: "التصنيفات | لوحة المطعم",
  description: "إدارة تصنيفات القائمة",
};

/** صفحة لوحة المطعم فقط — عند الدخول بدون subdomain نوجّه إلى /admin */
export default async function AdminCategoriesPage() {
  const tenant = await getIdentifiedRestaurant();
  if (!tenant) redirect("/admin");

  const profile = await getProfileForRestaurantAdminOrRedirect(tenant.id);
  const restaurantId = profile.restaurant_id!;
  const categories = await getCategoriesForRestaurant(restaurantId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">التصنيفات</h2>
        <p className="text-muted-foreground">
          تنظيم القائمة (مثلاً: مقبلات، أطباق رئيسية، مشروبات).
        </p>
      </div>
      <CategoriesManager
        restaurantId={restaurantId}
        initialCategories={categories}
      />
    </div>
  );
}
