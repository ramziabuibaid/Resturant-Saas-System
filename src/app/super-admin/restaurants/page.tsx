import { getAllRestaurants } from "@/app/actions/super-admin";
import { RestaurantsTable } from "./restaurants-table";

export const metadata = {
  title: "Restaurants | Super Admin",
  description: "Manage all restaurants",
};

export default async function SuperAdminRestaurantsPage() {
  const restaurants = await getAllRestaurants();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Restaurants</h1>
        <p className="text-muted-foreground">
          View and manage all restaurants. Create new restaurants and assign owners.
        </p>
      </div>
      <RestaurantsTable initialRestaurants={restaurants} />
    </div>
  );
}
