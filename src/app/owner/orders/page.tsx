import { headers } from "next/headers";
import { getProfileOrRedirect } from "@/app/actions/auth";
import { getRestaurantForProfile } from "@/app/actions/auth";
import { listRestaurantOrders } from "@/app/actions/orders";
import { OrdersClient } from "./orders-client";

export const metadata = {
  title: "الطلبات | لوحة المطعم",
  description: "طلبات الزبائن من المنيو",
};

export default async function OwnerOrdersPage() {
  const profile = await getProfileOrRedirect();
  const restaurant = await getRestaurantForProfile(profile);
  const { orders, error } = await listRestaurantOrders({ limit: 100 });

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const publicBaseUrl = host ? `${proto}://${host}` : "";

  const currencyCode = restaurant?.currency_code ?? "SAR";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الطلبات</h1>
        <p className="text-muted-foreground">
          الطلبات الواردة من المنيو العام (QR أو روابط السوشيال). حدّث حالة الطلب حسب سير العمل في مطعمك.
        </p>
      </div>
      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          تعذر تحميل الطلبات: {error}. نفّذ ملف{" "}
          <code className="rounded bg-muted px-1">supabase/orders-tables-customers.sql</code> إن لم يكن مفعّلاً.
        </p>
      ) : (
        <OrdersClient
          initialOrders={orders}
          currencyCode={currencyCode}
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
          phoneCountryPrefix={restaurant?.phone_country_prefix ?? null}
          subdomain={restaurant?.subdomain ?? ""}
          publicBaseUrl={publicBaseUrl}
          restaurantName={restaurant?.name ?? "المطعم"}
        />
      )}
    </div>
  );
}
