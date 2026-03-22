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
  const { orders, error } = await listRestaurantOrders({ limit: 80 });

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
        <OrdersClient initialOrders={orders} currencyCode={currencyCode} />
      )}
    </div>
  );
}
