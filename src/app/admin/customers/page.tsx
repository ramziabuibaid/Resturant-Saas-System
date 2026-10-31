import { requireRestaurantAdmin } from "@/lib/admin-context";
import { getRestaurantForProfile } from "@/lib/data/restaurants";
import { listLoyaltyDashboardCustomers, listRestaurantRewards } from "@/app/actions/customers";
import { listRecentOutboundNotifications } from "@/app/actions/notifications";
import { CustomersManager } from "@/components/loyalty/customers-manager";

export const metadata = {
  title: "العملاء والولاء",
  description: "عملاء المطعم ونقاطهم ومكافآتهم",
};

export default async function AdminCustomersPage() {
  const { profile } = await requireRestaurantAdmin();
  const [restaurant, customersRes, rewardsRes, notificationsRes] = await Promise.all([
    getRestaurantForProfile(profile),
    listLoyaltyDashboardCustomers(),
    listRestaurantRewards(),
    listRecentOutboundNotifications(),
  ]);

  const error = customersRes.error ?? rewardsRes.error ?? notificationsRes.error;
  if (error) {
    return (
      <p className="rounded-xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-500/15 dark:text-red-300">
        تعذر تحميل العملاء: {error}
      </p>
    );
  }

  const secondaryOn = restaurant?.secondary_currency_enabled === true;

  return (
    <CustomersManager
      customers={customersRes.customers}
      rewards={rewardsRes.rewards}
      notifications={notificationsRes.rows}
      phoneCountryPrefix={restaurant?.phone_country_prefix ?? null}
      restaurantName={restaurant?.name ?? "المطعم"}
      currencyCode={restaurant?.currency_code ?? "ILS"}
      pointValueCents={Number(restaurant?.loyalty_point_value_cents ?? 10)}
      loyaltyEnabled={restaurant?.loyalty_program_enabled === true}
      secondaryCurrencyCode={secondaryOn ? (restaurant?.secondary_currency_code ?? null) : null}
      secondaryExchangeRate={
        secondaryOn && restaurant?.secondary_currency_exchange_rate != null
          ? Number(restaurant.secondary_currency_exchange_rate)
          : null
      }
    />
  );
}
