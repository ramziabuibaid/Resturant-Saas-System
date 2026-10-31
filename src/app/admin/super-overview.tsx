import Link from "next/link";
import { headers } from "next/headers";
import {
  ArrowLeftIcon,
  Building2Icon,
  ExternalLinkIcon,
  PlusIcon,
  ShoppingBagIcon,
  TrendingUpIcon,
  UsersIcon,
} from "lucide-react";
import { getPlatformOverview, type PlatformRestaurantRow } from "@/lib/data/platform";
import { buildTenantPublicSiteUrl } from "@/lib/tenant-public-url";
import { cn } from "@/lib/utils";
import { PlatformChart } from "./platform-chart";

export const RESTAURANT_STATUS_UI: Record<PlatformRestaurantRow["status"], { label: string; cls: string }> = {
  active: { label: "نشط", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  trial: { label: "تجريبي", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  suspended: { label: "موقوف", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
};

function daysAgo(iso: string | null) {
  if (!iso) return null;
  const d = Math.floor((new Date().getTime() - new Date(iso).getTime()) / 86_400_000);
  return d <= 0 ? "اليوم" : d === 1 ? "أمس" : `قبل ${d} يوم`;
}

/** لوحة مالك النظام — /admin على النطاق الرئيسي */
export async function SuperOverview() {
  const o = await getPlatformOverview();
  const h = await headers();
  const host = h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";

  const live = o.restaurants.filter((r) => r.status !== "suspended");
  const withOrders = live.filter((r) => r.orders30d > 0).length;
  // مطاعم تحتاج متابعة: بلا أصناف، أو بلا طلبات منذ 7 أيام
  const attention = live.filter(
    (r) => r.items === 0 || !r.lastOrderAt || new Date().getTime() - new Date(r.lastOrderAt).getTime() > 7 * 86_400_000
  );

  const stats = [
    {
      label: "المطاعم",
      value: o.restaurants.length,
      hint: `${o.restaurants.filter((r) => r.status === "active").length} نشط · ${o.restaurants.filter((r) => r.status === "trial").length} تجريبي`,
      icon: Building2Icon,
    },
    { label: "طلبات اليوم", value: o.ordersToday, hint: "عبر كل المطاعم", icon: ShoppingBagIcon },
    { label: "طلبات 30 يوماً", value: o.orders30d, hint: `${withOrders} مطعم استقبل طلبات`, icon: TrendingUpIcon },
    { label: "عملاء المطاعم", value: o.customers, hint: "أرقام جوال مسجّلة", icon: UsersIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">أهلاً بك 👋</h1>
          <p className="text-sm text-text-muted">نظرة سريعة على المنصة والمطاعم المشتركة.</p>
        </div>
        <Link
          href="/admin/restaurants?new=1"
          className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-dark"
        >
          <PlusIcon className="size-4" />
          مطعم جديد
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[20px] border border-border bg-bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-text-muted sm:text-sm">{s.label}</p>
              <span className="flex size-8 items-center justify-center rounded-xl bg-brand-light text-brand">
                <s.icon className="size-4" />
              </span>
            </div>
            <p className="mt-2 font-display text-2xl font-bold tabular-nums">{s.value.toLocaleString("en")}</p>
            <p className="mt-1 truncate text-[11px] text-text-muted sm:text-xs">{s.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-[20px] border border-border bg-bg-surface p-5">
          <p className="font-bold">الطلبات على المنصة</p>
          <p className="mb-3 text-xs text-text-muted">آخر 14 يوماً</p>
          <PlatformChart daily={o.daily} />
        </section>

        <section className="rounded-[20px] border border-border bg-bg-surface p-5">
          <p className="font-bold">تحتاج متابعة</p>
          <p className="mb-3 text-xs text-text-muted">بلا أصناف أو بلا طلبات منذ أسبوع</p>
          {attention.length === 0 ? (
            <p className="py-10 text-center text-sm text-text-muted">كل المطاعم تعمل بشكل جيد ✨</p>
          ) : (
            <ul className="space-y-2">
              {attention.slice(0, 5).map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-xl bg-bg-surface-2/60 px-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.name}</span>
                    <span className="block text-xs text-text-muted">
                      {r.items === 0 ? "لم يضف أصنافاً بعد" : `آخر طلب: ${daysAgo(r.lastOrderAt) ?? "لا يوجد"}`}
                    </span>
                  </span>
                  <a
                    href={buildTenantPublicSiteUrl(r.subdomain, host, proto)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`فتح منيو ${r.name}`}
                    className="flex size-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg-surface hover:text-text-primary"
                  >
                    <ExternalLinkIcon className="size-4" />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-[20px] border border-border bg-bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-bold">أحدث المطاعم</p>
          <Link href="/admin/restaurants" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
            كل المطاعم
            <ArrowLeftIcon className="size-4" />
          </Link>
        </div>
        {o.restaurants.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-text-muted">لا توجد مطاعم بعد.</p>
        ) : (
          <ul className="divide-y divide-border">
            {o.restaurants.slice(0, 6).map((r) => {
              const st = RESTAURANT_STATUS_UI[r.status];
              return (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-light font-bold text-brand">
                    {r.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logoUrl} alt="" className="size-full object-cover" />
                    ) : (
                      r.name.charAt(0)
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.name}</span>
                    <span className="block truncate font-mono text-xs text-text-muted">{r.subdomain}</span>
                  </span>
                  <span className="hidden text-end text-xs text-text-muted sm:block">
                    <span className="block font-semibold text-text-secondary">{r.orders30d} طلب</span>
                    آخر 30 يوماً
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", st.cls)}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
