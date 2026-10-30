import { requireRestaurantAdmin } from "@/lib/admin-context";
import { headers } from "next/headers";
import { getRestaurantForProfile } from "@/lib/data/restaurants";
import {
  listLoyaltyDashboardCustomers,
  listRestaurantCustomers,
  listRestaurantRewards,
} from "@/app/actions/customers";
import { listRecentOutboundNotifications } from "@/app/actions/notifications";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomersClient } from "@/components/loyalty/customers-client";
import { LoyaltyDashboardClient } from "@/components/loyalty/loyalty-dashboard-client";

export const metadata = {
  title: "العملاء والولاء",
  description: "إجمالي المشتريات والنقاط",
};

export default async function AdminCustomersPage() {
  const { profile } = await requireRestaurantAdmin();
  const restaurant = await getRestaurantForProfile(profile);
  const { customers, error } = await listRestaurantCustomers();
  const [dashboardRes, rewardsRes, notificationsRes] = await Promise.all([
    listLoyaltyDashboardCustomers(),
    listRestaurantRewards(),
    listRecentOutboundNotifications(),
  ]);

  const currencyCode = restaurant?.currency_code ?? "SAR";
  const pointValueCents = Number(restaurant?.loyalty_point_value_cents ?? 10);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const publicBaseUrl = host ? `${proto}://${host}`.replace(/\/$/, "") : "";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">العملاء والولاء</h1>
        <p className="text-muted-foreground">
          قائمة بأرقام الجوال التي طلبت من المنيو، مرتبة حسب إجمالي المشتريات.
        </p>
      </div>


      <Card>
        <CardHeader>
          <CardTitle className="text-base">قيمة النقطة في الجدول</CardTitle>
          <CardDescription>
            عمود «قيمة الرصيد (تقدير)» = رصيد النقاط × قيمة النقطة من إعدادات الولاء.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          تعذر تحميل العملاء: {error}
        </p>
      ) : (
        <div className="space-y-6">
          {dashboardRes.error || rewardsRes.error || notificationsRes.error ? (
            <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              تعذر تحميل لوحة الولاء الاحترافية:{" "}
              {dashboardRes.error ?? rewardsRes.error ?? notificationsRes.error}
            </p>
          ) : (
            <LoyaltyDashboardClient
              customers={dashboardRes.customers}
              rewards={rewardsRes.rewards}
              notifications={notificationsRes.rows}
              phoneCountryPrefix={restaurant?.phone_country_prefix ?? null}
              subdomain={restaurant?.subdomain ?? ""}
              publicBaseUrl={publicBaseUrl}
              restaurantName={restaurant?.name ?? "المطعم"}
              currencyCode={currencyCode}
              pointValueCents={pointValueCents}
              secondaryCurrencyCode={
                restaurant?.secondary_currency_enabled === true
                  ? restaurant.secondary_currency_code ?? null
                  : null
              }
              secondaryExchangeRate={
                restaurant?.secondary_currency_enabled === true &&
                restaurant.secondary_currency_exchange_rate != null
                  ? Number(restaurant.secondary_currency_exchange_rate)
                  : null
              }
            />
          )}
          <div>
            <h2 className="mb-2 text-lg font-semibold">ملخص المشتريات (العرض السابق)</h2>
            <CustomersClient
              customers={customers}
              currencyCode={currencyCode}
              pointValueCents={pointValueCents}
              secondaryCurrencyCode={
                restaurant?.secondary_currency_enabled === true
                  ? restaurant.secondary_currency_code ?? null
                  : null
              }
              secondaryExchangeRate={
                restaurant?.secondary_currency_enabled === true &&
                restaurant.secondary_currency_exchange_rate != null
                  ? Number(restaurant.secondary_currency_exchange_rate)
                  : null
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}
