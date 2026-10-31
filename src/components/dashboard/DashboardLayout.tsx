"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ExternalLink, Flame, LogOut, MoreHorizontal } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { OrderNotificationsBell } from "@/components/orders/order-notifications-bell";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  /** يظهر في شريط الجوال السفلي (أقصى 4 عناصر) */
  mobile?: boolean;
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
  /** اسم المطعم أو «لوحة مالك النظام» */
  title: string;
  navGroups: NavGroup[];
  /** رابط معاينة المنيو (اختياري) */
  previewUrl?: string | null;
  logoUrl?: string | null;
  profile?: DashboardProfile | null;
  /** جرس الطلبات الجديدة (استعلام دوري) */
  notificationRestaurantId?: string | null;
  children: React.ReactNode;
};

function isActive(pathname: string, href: string, rootHref: string) {
  if (href === rootHref) return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

function SignOutButton({ compact = false }: { compact?: boolean }) {
  return (
    <form action="/auth/signout" method="POST">
      <button
        type="submit"
        className={cn(
          "flex items-center gap-2 rounded-xl text-sm font-medium text-text-secondary transition hover:bg-bg-surface-2 hover:text-danger",
          compact ? "size-10 justify-center" : "h-10 w-full px-3"
        )}
        aria-label="تسجيل الخروج"
      >
        <LogOut className="size-[18px]" />
        {compact ? null : "تسجيل الخروج"}
      </button>
    </form>
  );
}

function SidebarContent({
  pathname,
  navGroups,
  title,
  logoUrl,
  profile,
  rootHref,
}: {
  pathname: string;
  navGroups: NavGroup[];
  title: string;
  logoUrl?: string | null;
  profile?: DashboardProfile | null;
  rootHref: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <Link href={rootHref} className="flex h-16 shrink-0 items-center gap-3 px-5">
        {logoUrl ? (
          <span className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-border bg-bg-surface-2">
            <Image src={logoUrl} alt="" fill className="object-cover" sizes="40px" />
          </span>
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white">
            <Flame className="size-5" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate font-display text-[17px] font-bold leading-tight text-text-primary">{title}</span>
          <span className="block text-[11px] text-text-muted">لوحة التحكم · منيو</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[11px] font-semibold text-text-muted">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href, rootHref);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                        active
                          ? "bg-brand-light font-semibold text-brand"
                          : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
                      )}
                    >
                      {active ? <span className="absolute inset-y-2 -start-3 w-1 rounded-e-full bg-brand" /> : null}
                      {item.icon ? (
                        <span className="flex size-5 shrink-0 items-center justify-center [&>svg]:size-[18px]">{item.icon}</span>
                      ) : null}
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      {item.badge != null ? (
                        <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white">{item.badge}</span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-border p-3">
        {profile?.name ? (
          <div className="flex items-center gap-3 px-2 py-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-bold text-brand">
              {profile.name.charAt(0)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-text-primary">{profile.name}</span>
              {profile.role ? <span className="block truncate text-xs text-text-muted">{profile.role}</span> : null}
            </span>
          </div>
        ) : null}
        <SignOutButton />
      </div>
    </div>
  );
}

export function DashboardLayout({
  title,
  navGroups,
  previewUrl,
  logoUrl,
  profile,
  notificationRestaurantId,
  children,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const rootHref = navGroups[0]?.items[0]?.href ?? "/admin";
  const allItems = navGroups.flatMap((g) => g.items);
  const currentItem = allItems.find((i) => isActive(pathname, i.href, rootHref));
  const mobileItems = allItems.filter((i) => i.mobile).slice(0, 4);

  // إغلاق قائمة «المزيد» عند الانتقال لصفحة أخرى
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMoreOpen(false);
  }

  return (
    <div className="flex min-h-svh bg-bg-base" dir="rtl">
      <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 border-e border-border bg-bg-surface md:block">
        <SidebarContent
          pathname={pathname}
          navGroups={navGroups}
          title={title}
          logoUrl={logoUrl}
          profile={profile}
          rootHref={rootHref}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-bg-base/85 px-4 backdrop-blur-xl sm:px-8">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg font-bold text-text-primary">{currentItem?.label ?? title}</p>
            <p className="truncate text-xs text-text-muted md:hidden">{title}</p>
          </div>
          {previewUrl ? (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-bg-surface px-3.5 text-sm font-semibold text-text-secondary transition hover:text-text-primary sm:inline-flex"
            >
              <ExternalLink className="size-4" />
              معاينة المنيو
            </a>
          ) : null}
          {notificationRestaurantId ? (
            <OrderNotificationsBell restaurantId={notificationRestaurantId} variant="dashboard" />
          ) : null}
          <ThemeToggle />
          <span className="md:hidden">
            <SignOutButton compact />
          </span>
        </header>

        <main className={cn("flex-1 p-4 sm:p-8", mobileItems.length ? "pb-28 md:pb-8" : "")}>
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      {/* شريط الجوال السفلي */}
      {mobileItems.length ? (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
          <ul className="flex">
            {mobileItems.map((item) => {
              const active = isActive(pathname, item.href, rootHref);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                      active ? "text-brand" : "text-text-muted"
                    )}
                  >
                    <span className={cn("flex h-7 w-12 items-center justify-center rounded-full [&>svg]:size-5", active && "bg-brand-light")}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold text-text-muted"
              >
                <span className="flex h-7 w-12 items-center justify-center">
                  <MoreHorizontal className="size-5" />
                </span>
                المزيد
              </button>
            </li>
          </ul>
        </nav>
      ) : null}

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="w-[280px] max-w-[85vw] bg-bg-surface p-0">
          <SheetTitle className="sr-only">القائمة</SheetTitle>
          <SidebarContent
            pathname={pathname}
            navGroups={navGroups}
            title={title}
            logoUrl={logoUrl}
            profile={profile}
            rootHref={rootHref}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
