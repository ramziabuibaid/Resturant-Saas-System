import { headers } from "next/headers";
import { getProfileOrRedirect, getRestaurantForProfile } from "@/app/actions/auth";
import {
  listLoyaltyDashboardCustomers,
  listRestaurantCustomers,
  listRestaurantRewards,
} from "@/app/actions/customers";
import { listRecentOutboundNotifications } from "@/app/actions/notifications";
import { CustomersClient } from "@/components/loyalty/customers-client";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoyaltyDashboardClient } from "@/components/loyalty/loyalty-dashboard-client";

export const metadata = {
  title: "العملاء والولاء | لوحة المطعم",
  description: "إجمالي المشتريات والنقاط لكل زبون",
};

export default async function OwnerCustomersPage() {
  const profile = await getProfileOrRedirect();
  const restaurant = await getRestaurantForProfile(profile);
  const { customers, error, loyaltyColumnsMissing } = await listRestaurantCustomers();
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
          قائمة بأرقام الجوال التي طلبت من المنيو، مرتبة حسب إجمالي المشتريات. تُستخدم لاحقاً
          للحملات والاستهداف وفق إعدادات النقاط في الإعدادات.
        </p>
      </div>

      {loyaltyColumnsMissing ? (
        <div
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-50"
          role="status"
        >
          <p className="font-medium">قاعدة البيانات تحتاج تحديثاً لأعمدة المشتريات والنقاط</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">
            افتح Supabase → SQL → انسخ محتوى الملف{" "}
            <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px]">
              supabase/FIX-customer-phones-loyalty-columns.sql
            </code>{" "}
            والصقه وشغّل Run. بعدها أعد تحميل الصفحة لتظهر المبالغ والنقاط الحقيقية.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">قيمة النقطة في الجدول</CardTitle>
          <CardDescription>
            عمود «قيمة الرصيد (تقدير)» = رصيد النقاط × قيمة النقطة التي حددتها في إعدادات الولاء.
            يُحدَّث احتساب النقاط الجديدة من الطلبات حسب نفس الإعدادات.
          </CardDescription>
        </CardHeader>
      </Card>

      {error ? (
        <p className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          تعذر تحميل العملاء: {error}. تأكد من تنفيذ ملفات SQL للطلبات والعملاء والولاء في Supabase.
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
