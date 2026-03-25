"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BellIcon, PanelLeftIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { OrderNotificationsBell } from "@/components/orders/order-notifications-bell";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export type DashboardProfile = {
  name?: string;
  imageUrl?: string | null;
  role?: string;
};

type DashboardLayoutProps = {
  /** عنوان الهيدر (اسم المطعم أو "لوحة مالك النظام") */
  title: string;
  /** مجموعات الروابط في الشريط الجانبي */
  navGroups: NavGroup[];
  /** محتوى الهيدر من اليمين (مثل قائمة المستخدم / تسجيل الخروج) */
  headerRight?: React.ReactNode;
  /** رابط معاينة المنيو (اختياري) */
  previewUrl?: string | null;
  /** شعار المطعم أو العلامة في أعلى الـ Sidebar (اختياري) */
  logoUrl?: string | null;
  /** بيانات البروفايل في أسفل الـ Sidebar (اختياري) */
  profile?: DashboardProfile | null;
  /** عند التمرير: جرس طلبات حي (Supabase Realtime) */
  notificationRestaurantId?: string | null;
  children: React.ReactNode;
};

function SidebarNavContent({
  pathname,
  navGroups,
  title,
  logoUrl,
  profile,
  firstHref,
}: {
  pathname: string;
  navGroups: NavGroup[];
  title: string;
  logoUrl?: string | null;
  profile?: DashboardProfile | null;
  firstHref: string;
}) {
  return (
    <>
      <div className="flex h-[60px] shrink-0 items-center px-5">
        <Link
          href={firstHref}
          className="flex items-center gap-3 text-[var(--text-primary)] no-underline"
        >
          {logoUrl ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-[var(--radius-md)] bg-[var(--bg-surface-2)]">
              <Image
                src={logoUrl}
                alt=""
                fill
                className="object-contain"
                sizes="36px"
                unoptimized
              />
            </div>
          ) : null}
          <span className="text-lg font-semibold truncate">{title}</span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              {group.label}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {item.icon && (
                        <span className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-5">
                          {item.icon}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate">
                        {item.label}
                      </span>
                      {item.badge != null && (
                        <span className="rounded-full bg-[var(--brand)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-inverse)]">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {profile && (profile.name || profile.imageUrl) && (
        <div className="shrink-0 border-t border-[var(--border)] p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {profile.imageUrl ? (
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--bg-surface-2)]">
                <Image
                  src={profile.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="36px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand-light)] text-sm font-semibold text-[var(--brand)]">
                {(profile.name ?? "؟").charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {profile.name ?? "—"}
              </p>
              {profile.role && (
                <p className="truncate text-xs text-[var(--text-muted)]">
                  {profile.role}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function DashboardLayout({
  title,
  navGroups,
  headerRight,
  previewUrl,
  logoUrl,
  profile,
  notificationRestaurantId,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const firstHref = navGroups[0]?.items[0]?.href ?? "/admin";

  useEffect(() => {
    if (mobileMenuOpen) setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <div className="flex min-h-svh bg-[var(--bg-base)]">
      {/* Desktop Sidebar — hidden on mobile */}
      <aside
        className="sticky top-0 z-20 hidden h-svh w-[var(--sidebar-width)] flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] md:flex"
        style={{ width: "var(--sidebar-width)" }}
      >
        <SidebarNavContent
          pathname={pathname}
          navGroups={navGroups}
          title={title}
          logoUrl={logoUrl}
          profile={profile}
          firstHref={firstHref}
        />
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header — DESIGN_SYSTEM: 60px, اسم المطعم يسار، معاينة + ThemeToggle + avatar يمين */}
        <header
          className="sticky top-0 z-10 flex h-[var(--header-height)] items-center gap-4 border-b border-[var(--border)] bg-[var(--bg-surface)]/80 px-4 backdrop-blur-[12px] sm:px-6"
          style={{ height: "var(--header-height)" }}
        >
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger
                className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
                aria-label="فتح القائمة"
              >
                <PanelLeftIcon className="size-5" />
              </SheetTrigger>
              <SheetContent side="right" className="flex w-[var(--sidebar-width)] max-w-[85vw] flex-col p-0">
                <div className="flex h-full flex-col bg-[var(--bg-surface)]">
                  <SidebarNavContent
                    pathname={pathname}
                    navGroups={navGroups}
                    title={title}
                    logoUrl={logoUrl}
                    profile={profile}
                    firstHref={firstHref}
                  />
                </div>
              </SheetContent>
            </Sheet>
          )}
          <div className="min-w-0 flex-1 font-semibold text-[var(--text-primary)] truncate">
            {title}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
              >
                معاينة المنيو
              </a>
            )}
            {notificationRestaurantId ? (
              <OrderNotificationsBell restaurantId={notificationRestaurantId} variant="dashboard" />
            ) : (
              <button
                type="button"
                className="flex size-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
                aria-label="الإشعارات"
              >
                <BellIcon className="size-5" />
              </button>
            )}
            <ThemeToggle />
            {headerRight}
          </div>
        </header>

        {/* Main content — DESIGN_SYSTEM: padding, responsive */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
