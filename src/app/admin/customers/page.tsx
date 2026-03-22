import { redirect } from "next/navigation";
import { resolveAdminTenant } from "@/lib/admin-resolve-tenant";
import {
  getProfileForRestaurantAdminOrRedirect,
  getRestaurantForProfile,
} from "@/app/actions/auth";
import { listRestaurantCustomers } from "@/app/actions/customers";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CustomersClient } from "@/app/owner/customers/customers-client";

export const metadata = {
  title: "العملاء والولاء",
  description: "إجمالي المشتريات والنقاط",
};

export default async function AdminCustomersPage() {
  const tenant = await resolveAdminTenant();
  if (!tenant) redirect("/admin");

  const profile = await getProfileForRestaurantAdminOrRedirect(tenant.id);
  const restaurant = await getRestaurantForProfile(profile);
  const { customers, error, loyaltyColumnsMissing } = await listRestaurantCustomers();

  const currencyCode = restaurant?.currency_code ?? "SAR";
  const pointValueCents = Number(restaurant?.loyalty_point_value_cents ?? 10);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">العملاء والولاء</h1>
        <p className="text-muted-foreground">
          قائمة بأرقام الجوال التي طلبت من المنيو، مرتبة حسب إجمالي المشتريات.
        </p>
      </div>

      {loyaltyColumnsMissing ? (
        <div
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-50"
          role="status"
        >
          <p className="font-medium">قاعدة البيانات تحتاج تحديثاً لأعمدة المشتريات والنقاط</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">
            Supabase → SQL — نفّذ الملف{" "}
            <code className="rounded bg-background/80 px-1.5 py-0.5 font-mono text-[11px]">
              supabase/FIX-customer-phones-loyalty-columns.sql
            </code>
          </p>
        </div>
      ) : null}

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
          تعذر تحميل العملاء: {error}. تأكد من تنفيذ ملفات SQL في Supabase.
        </p>
      ) : (
        <CustomersClient
          customers={customers}
          currencyCode={currencyCode}
          pointValueCents={pointValueCents}
        />
      )}
    </div>
  );
}
