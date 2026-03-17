import Link from "next/link";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import {
  getSuperAdminProfileOrRedirect,
  getProfileForRestaurantAdminOrRedirect,
  getOwnerDashboardStats,
} from "@/app/actions/auth";
import { getSuperAdminStats, getAllRestaurants } from "@/app/actions/super-admin";
import {
  Building2Icon,
  UtensilsCrossedIcon,
  TrendingUpIcon,
  FolderIcon,
  DollarSignIcon,
  ShoppingBagIcon,
  StarIcon,
} from "lucide-react";
import { AdminDashboardCharts } from "./admin-dashboard-charts";
import { OwnerDashboardCharts } from "@/app/owner/owner-dashboard-charts";

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
  const tenant = await getIdentifiedRestaurant();

  if (!tenant) {
    await getSuperAdminProfileOrRedirect();
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
  const profile = await getProfileForRestaurantAdminOrRedirect(tenant.id);
  const stats = await getOwnerDashboardStats(profile.restaurant_id!);

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="text-[32px] font-bold leading-tight text-[var(--text-primary)]">
          نظرة عامة
        </h1>
        <p className="mt-1 text-base text-[var(--text-secondary)]">
          القائمة والمطعم في لمحة. إدارة التصنيفات والأصناف أدناه.
        </p>
      </div>

      {/* Stats Row — DESIGN_SYSTEM */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stat-card card-enter">
          <div className="stat-icon">
            <ShoppingBagIcon className="size-5" />
          </div>
          <div className="stat-label">طلبات اليوم</div>
          <div className="stat-value">—</div>
          <p className="text-[13px] text-[var(--text-muted)]">قريباً</p>
        </div>
        <div className="stat-card card-enter">
          <div className="stat-icon">
            <DollarSignIcon className="size-5" />
          </div>
          <div className="stat-label">إيرادات اليوم</div>
          <div className="stat-value">—</div>
          <p className="text-[13px] text-[var(--text-muted)]">قريباً</p>
        </div>
        <div className="stat-card card-enter">
          <div className="stat-icon">
            <UtensilsCrossedIcon className="size-5" />
          </div>
          <div className="stat-label">أصناف المنيو</div>
          <div className="stat-value">{stats.menuItemsCount}</div>
          <p className="text-[13px] text-[var(--text-muted)]">إجمالي الأصناف</p>
        </div>
        <div className="stat-card card-enter">
          <div className="stat-icon">
            <StarIcon className="size-5" />
          </div>
          <div className="stat-label">متوسط التقييم</div>
          <div className="stat-value">—</div>
          <p className="text-[13px] text-[var(--text-muted)]">قريباً</p>
        </div>
      </div>

      <OwnerDashboardCharts stats={stats} />

      {/* Quick Actions */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            التصنيفات
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {stats.categoriesCount} تصنيف
          </p>
          <Link
            href="/admin/categories"
            className={btnPrimary + " mt-4 inline-block"}
          >
            إدارة التصنيفات
          </Link>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            أصناف المنيو
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {stats.menuItemsCount} صنف
          </p>
          <Link href="/admin/menu" className={btnPrimary + " mt-4 inline-block"}>
            إدارة أصناف المنيو
          </Link>
        </div>
      </div>

      {/* Recent Orders placeholder */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          الطلبات الأخيرة
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          آخر الطلبات الواردة — قريباً.
        </p>
      </section>

      {/* Popular Items placeholder */}
      <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          أكثر الأصناف طلباً
        </h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          رسم بياني بسيط — قريباً.
        </p>
      </section>
    </div>
  );
}
