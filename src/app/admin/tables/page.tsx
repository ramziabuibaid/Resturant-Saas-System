import { requireRestaurantAdmin } from "@/lib/admin-context";
import { getRestaurantForProfile } from "@/lib/data/restaurants";
import { listRestaurantTables } from "@/app/actions/tables";
import { listRestaurantWaiters } from "@/app/actions/waiters";
import { buildTenantPublicSiteUrl } from "@/lib/tenant-public-url";
import { TablesClient } from "./tables-client";
import { headers } from "next/headers";

export const metadata = {
  title: "الطاولات ورموز QR",
  description: "إدارة طاولات المطعم وطباعة رموز QR",
};

export default async function AdminRestaurantTablesPage() {
  const { profile } = await requireRestaurantAdmin();
  const restaurant = await getRestaurantForProfile(profile);
  const { tables, error } = await listRestaurantTables();
  const { waiters: restaurantWaiters } = await listRestaurantWaiters();

  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const menuBaseUrl = buildTenantPublicSiteUrl(restaurant?.subdomain ?? null, host, proto);

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
          تعذر تحميل الطاولات: {error}
        </p>
      ) : null}
      <TablesClient
        initialTables={tables}
        menuBaseUrl={menuBaseUrl}
        restaurantName={restaurant?.name ?? "المطعم"}
        restaurantSubdomain={restaurant?.subdomain?.trim() ?? ""}
        waitersSystemEnabled={restaurant?.waiters_system_enabled === true}
        waiters={restaurantWaiters}
      />
    </div>
  );
}
