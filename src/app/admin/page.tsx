import { getAdminContext } from "@/lib/admin-context";
import Link from "next/link";
import { getRestaurantById } from "@/lib/data/restaurants";
import { getDashboardOverview, RESTAURANT_TZ } from "@/lib/data/dashboard";
import { formatMenuPrice } from "@/lib/currencies";
import { ORDER_STATUS_LABELS, orderStatusBadgeClasses } from "@/lib/order-status-ui";
import type { OrderStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { OverviewChart } from "./overview-chart";
import { getSuperAdminStats, getAllRestaurants } from "@/app/actions/super-admin";
import {
  Building2Icon,
  UtensilsCrossedIcon,
  TrendingUpIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  CheckIcon,
} from "lucide-react";
import { AdminDashboardCharts } from "./admin-dashboard-charts";

export const metadata = {
  title: "لوحة التحكم",
  description: "نظرة عامة",
};

/** زر أساسي — DESIGN_SYSTEM */
const btnPrimary =
  "inline-flex h-[38px] items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand)] px-4 text-sm font-semibold text-white transition-[background,transform] hover:bg-[var(--brand-dark)] active:scale-[0.98]";

/**
 * نفس المسار /admin يعرض محتوى مختلف حسب الـ subdomain:
 * - بدون subdomain → لوحة مالك النظام (Super Admin)
 * - مع subdomain → لوحة المطعم (Restaurant Admin)
 */
export default async function AdminDashboardPage() {
  const ctx = await getAdminContext();

  if (ctx.kind === "super") {
    const stats = await getSuperAdminStats();
    const restaurants = await getAllRestaurants();
    const recentRestaurants = restaurants.slice(0, 5);

    return (
      <div className="space-y-8 page-enter">
        <div>
          <h1 className="text-[32px] font-bold leading-tight text-[var(--text-primary)]">
            نظرة عامة
          </h1>
          <p className="mt-1 text-base text-[var(--text-secondary)]">
            إحصائيات النظام والمطاعم. إضافة وتحرير المطاعم وإنشاء مستخدمين للمطاعم.
          </p>
        </div>

        {/* Stats Row — DESIGN_SYSTEM: grid auto-fill minmax(280px, 1fr) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="stat-card card-enter">
            <div className="stat-icon">
              <Building2Icon className="size-5" />
            </div>
            <div className="stat-label">إجمالي المطاعم</div>
            <div className="stat-value">{stats.totalRestaurants}</div>
            <p className="text-[13px] text-[var(--text-muted)]">جميع المطاعم المسجلة</p>
          </div>
          <div className="stat-card card-enter">
            <div className="stat-icon">
              <TrendingUpIcon className="size-5" />
            </div>
            <div className="stat-label">المطاعم النشطة</div>
            <div className="stat-value">{stats.activeRestaurants}</div>
            <p className="text-[13px] text-[var(--text-muted)]">نشط أو تجريبي</p>
          </div>
          <div className="stat-card card-enter">
            <div className="stat-icon">
              <UtensilsCrossedIcon className="size-5" />
            </div>
            <div className="stat-label">أصناف القوائم</div>
            <div className="stat-value">{stats.totalMenuItems}</div>
            <p className="text-[13px] text-[var(--text-muted)]">عبر جميع المطاعم</p>
          </div>
          <div className="stat-card card-enter">
            <div className="stat-icon">
              <DollarSignIcon className="size-5" />
            </div>
            <div className="stat-label">الإيرادات الشهرية</div>
            <div className="stat-value">—</div>
            <p className="text-[13px] text-[var(--text-muted)]">قريباً</p>
          </div>
        </div>

        <AdminDashboardCharts stats={stats} />

        {/* Recent Restaurants Table — DESIGN_SYSTEM */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold leading-tight text-[var(--text-primary)]">
              أحدث المطاعم
            </h2>
            <Link href="/admin/restaurants" className={btnPrimary}>
              عرض الكل
            </Link>
          </div>
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-surface-2)] text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="p-4 text-right">الاسم</th>
                  <th className="p-4 text-right">النطاق الفرعي</th>
                  <th className="p-4 text-right">اسم المستخدم</th>
                  <th className="p-4 text-right">الحالة</th>
                  <th className="p-4 text-right">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {recentRestaurants.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">
                      لا توجد مطاعم بعد. أضف مطعم من الإجراءات السريعة.
                    </td>
                  </tr>
                ) : (
                  recentRestaurants.map((r) => (
                    <tr
                      key={r.id}
                      className="h-[52px] border-b border-[var(--border)] transition-colors hover:bg-[var(--bg-surface-2)]"
                    >
                      <td className="p-4 font-medium text-[var(--text-primary)]">
                        {r.name}
                      </td>
                      <td className="p-4 font-mono text-[12px] text-[var(--text-secondary)]">
                        {r.subdomain}
                      </td>
                      <td className="p-4 font-medium text-[var(--text-secondary)]">
                        {r.owner_username ?? "—"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-semibold ${
                            r.status === "active" || !r.status
                              ? "bg-[var(--success-bg)] text-[var(--success)]"
                              : r.status === "trial"
                                ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                                : "bg-[var(--danger-bg)] text-[var(--danger)]"
                          }`}
                        >
                          {r.status === "active" || !r.status
                            ? "نشط"
                            : r.status === "trial"
                              ? "تجريبي"
                              : "موقوف"}
                        </span>
                      </td>
                      <td className="p-4 text-[var(--text-muted)]">
                        {r.created_at
                          ? new Date(r.created_at).toLocaleDateString("ar-SA")
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick Actions — DESIGN_SYSTEM */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            إجراءات سريعة
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            إدارة المطاعم وإنشاء مستخدمين للمطاعم.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/admin/restaurants" className={btnPrimary}>
              إضافة مطعم جديد
            </Link>
            <Link
              href="/admin/restaurants"
              className="inline-flex h-[38px] items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface-2)] px-4 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-overlay)]"
            >
              عرض جميع المطاعم
            </Link>
          </div>
        </section>

        {/* Activity Feed placeholder */}
        <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            آخر النشاط
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            آخر المطاعم المسجلة والاشتراكات — قريباً.
          </p>
        </section>
      </div>
    );
  }

  /* ========== Restaurant Admin Dashboard ========== */
  return <RestaurantOverview restaurantId={ctx.restaurantId} />;
}

/* ------------------------------------------------------------------ */

async function RestaurantOverview({ restaurantId }: { restaurantId: string }) {
  const [o, restaurant] = await Promise.all([getDashboardOverview(restaurantId), getRestaurantById(restaurantId)]);
  const currency = restaurant?.currency_code ?? "ILS";
  const money = (c: number) => formatMenuPrice(c, currency);
  const revenueDelta =
    o.yesterdayRevenueCents > 0
      ? Math.round(((o.todayRevenueCents - o.yesterdayRevenueCents) / o.yesterdayRevenueCents) * 100)
      : null;

  const steps = [
    { done: o.setup.hasLogo && o.setup.hasCover, label: "أضف الشعار وصورة الغلاف", href: "/admin/settings" },
    { done: o.setup.categories > 0, label: "أنشئ تصنيفات المنيو", href: "/admin/categories" },
    { done: o.setup.items >= 3, label: "أضف 3 أصناف على الأقل مع صورها", href: "/admin/menu" },
    { done: o.setup.tables > 0, label: "أنشئ الطاولات واطبع رموز QR", href: "/admin/tables" },
    { done: o.setup.orders > 0, label: "استقبل أول طلب", href: "/admin/orders" },
  ];
  const doneSteps = steps.filter((x) => x.done).length;

  const stats = [
    { label: "طلبات اليوم", value: String(o.todayOrders), icon: ShoppingBagIcon, hint: o.activeOrders ? `${o.activeOrders} قيد التنفيذ` : "لا طلبات نشطة" },
    {
      label: "إيراد اليوم",
      value: money(o.todayRevenueCents),
      icon: DollarSignIcon,
      hint: revenueDelta == null ? "مقارنة بالأمس عند توفرها" : `${revenueDelta >= 0 ? "▲" : "▼"} ${Math.abs(revenueDelta)}٪ عن الأمس`,
      ltr: true,
    },
    { label: "متوسط الطلب", value: o.avgTicketCents ? money(o.avgTicketCents) : "—", icon: TrendingUpIcon, hint: "لطلبات اليوم", ltr: true },
    { label: "أصناف المنيو", value: String(o.setup.items), icon: UtensilsCrossedIcon, hint: `في ${o.setup.categories} تصنيفات` },
  ];

  return (
    <div className="space-y-6">
      {o.activeOrders > 0 ? (
        <Link
          href="/admin/orders"
          className="flex items-center justify-between gap-3 rounded-2xl bg-brand px-5 py-4 text-white shadow-[0_14px_34px_-16px_var(--brand)]"
        >
          <span className="flex items-center gap-3">
            <span className="relative flex size-3">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-white/70" />
              <span className="relative inline-flex size-3 rounded-full bg-white" />
            </span>
            <span className="font-bold">{o.activeOrders} طلبات قيد التنفيذ الآن</span>
          </span>
          <span className="text-sm font-semibold opacity-90">فتح الطلبات ←</span>
        </Link>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, hint, ltr }) => (
          <div key={label} className="rounded-[20px] border border-border bg-bg-surface p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text-secondary">{label}</p>
              <span className="flex size-9 items-center justify-center rounded-xl bg-brand-light text-brand">
                <Icon className="size-[18px]" />
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-bold sm:text-3xl" dir={ltr ? "ltr" : undefined}>
              <span className={ltr ? "block text-end" : undefined}>{value}</span>
            </p>
            <p className="mt-1 text-xs text-text-muted">{hint}</p>
          </div>
        ))}
      </div>

      {doneSteps < steps.length ? (
        <section className="rounded-[20px] border border-border bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">جهّز مطعمك</h2>
            <span className="text-sm font-semibold text-text-muted">
              {doneSteps} / {steps.length}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-bg-surface-2">
            <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(doneSteps / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {steps.map((st) => (
              <li key={st.label}>
                <Link
                  href={st.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition",
                    st.done ? "border-transparent bg-bg-surface-2 text-text-muted line-through" : "border-border hover:border-brand/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-full border",
                      st.done ? "border-success bg-success text-white" : "border-border-strong"
                    )}
                  >
                    {st.done ? <CheckIcon className="size-3.5" /> : null}
                  </span>
                  {st.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="rounded-[20px] border border-border bg-bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-lg font-bold">الإيراد — آخر 7 أيام</h2>
            <span className="text-sm text-text-muted" dir="ltr">
              {money(o.week.reduce((s, d) => s + d.revenueCents, 0))}
            </span>
          </div>
          <div className="mt-4">
            <OverviewChart week={o.week} currencyCode={currency} />
          </div>
        </section>

        <section className="rounded-[20px] border border-border bg-bg-surface p-5">
          <h2 className="font-display text-lg font-bold">الأكثر طلباً</h2>
          <p className="text-xs text-text-muted">آخر 30 يوماً</p>
          {o.topItems.length ? (
            <ol className="mt-4 space-y-3">
              {o.topItems.map((t, i) => {
                const max = o.topItems[0].qty || 1;
                return (
                  <li key={t.name}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <span className="w-4 text-text-muted">{i + 1}</span>
                        {t.name}
                      </span>
                      <span className="text-text-muted">{t.qty}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg-surface-2">
                      <div className="h-full rounded-full bg-brand/70" style={{ width: `${(t.qty / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="mt-6 text-center text-sm text-text-muted">ستظهر هنا أكثر الأصناف طلباً بعد أول طلبات.</p>
          )}
        </section>
      </div>

      <section className="rounded-[20px] border border-border bg-bg-surface">
        <div className="flex items-center justify-between p-5 pb-3">
          <h2 className="font-display text-lg font-bold">آخر الطلبات</h2>
          <Link href="/admin/orders" className="text-sm font-semibold text-brand">
            عرض الكل
          </Link>
        </div>
        {o.recentOrders.length ? (
          <ul className="divide-y divide-border">
            {o.recentOrders.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-5 py-3">
                <span className="w-12 font-display text-lg font-bold">#{r.displayNumber}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {r.tableLabel ?? (r.fulfillment === "delivery" ? "توصيل" : r.fulfillment === "pickup" ? "استلام" : "داخل المطعم")}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(r.createdAt).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit", timeZone: RESTAURANT_TZ })}
                  </p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", orderStatusBadgeClasses(r.status as OrderStatus))}>
                  {ORDER_STATUS_LABELS[r.status as OrderStatus] ?? r.status}
                </span>
                <span className="w-20 text-end text-sm font-bold" dir="ltr">
                  {money(r.totalCents)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-6 text-sm text-text-muted">لا طلبات بعد. شارك رابط المنيو أو اطبع رموز QR للطاولات.</p>
        )}
      </section>
    </div>
  );
}
