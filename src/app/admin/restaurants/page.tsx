import { redirect } from "next/navigation";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getAllRestaurants } from "@/app/actions/super-admin";
import { RestaurantsTable } from "./restaurants-table";

export const metadata = {
  title: "المطاعم | لوحة مالك النظام",
  description: "إدارة جميع المطاعم",
};

/** صفحة Super Admin فقط — عند الدخول من subdomain نوجّه إلى /admin */
export default async function AdminRestaurantsPage() {
  const tenant = await getIdentifiedRestaurant();
  if (tenant) redirect("/admin");

  const restaurants = await getAllRestaurants();
  const ownerUsernames = Object.fromEntries(
    restaurants.map((r) => [r.id, r.owner_username ?? null])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">المطاعم</h1>
        <p className="text-muted-foreground">
          عرض وإدارة جميع المطاعم. إضافة مطاعم جديدة وإنشاء مستخدم وكلمة مرور لصاحب كل مطعم.
        </p>
      </div>
      <RestaurantsTable
        initialRestaurants={restaurants}
        ownerUsernames={ownerUsernames}
      />
    </div>
  );
}
