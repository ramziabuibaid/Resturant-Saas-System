import { getProfileOrRedirect } from "@/app/actions/auth";
import { getCategoriesForRestaurant } from "@/app/actions/admin-categories";
import { CategoriesManager } from "@/app/admin/categories/categories-manager";

export const metadata = {
  title: "التصنيفات | لوحة المطعم",
  description: "إدارة تصنيفات القائمة",
};

export default async function OwnerCategoriesPage() {
  const profile = await getProfileOrRedirect();
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
