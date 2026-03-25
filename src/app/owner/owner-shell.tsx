"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboardIcon,
  FolderIcon,
  UtensilsCrossedIcon,
  SettingsIcon,
  SmartphoneIcon,
  QrCodeIcon,
  ClipboardListIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrderNotificationsBell } from "@/components/orders/order-notifications-bell";

type OwnerShellProps = {
  restaurantName: string;
  restaurantId: string;
  subdomain: string | null;
  livePreviewUrl: string | null;
  children: React.ReactNode;
};

export function OwnerShell({
  restaurantName,
  restaurantId,
  subdomain,
  livePreviewUrl,
  children,
}: OwnerShellProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar
        className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/80"
        style={{ position: "sticky", top: 0, height: "100vh" }}
      >
        <SidebarHeader className="border-b border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                render={
                  <Link href="/owner" className="flex items-center gap-2">
                    <LayoutDashboardIcon className="size-5" />
                    <span>نظرة عامة</span>
                  </Link>
                }
                isActive={pathname === "/owner"}
                size="lg"
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>إدارة القائمة</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/owner/items" className="flex items-center gap-2">
                        <UtensilsCrossedIcon className="size-5" />
                        <span>أصناف القائمة</span>
                      </Link>
                    }
                    isActive={pathname.startsWith("/owner/items")}
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/owner/categories" className="flex items-center gap-2">
                        <FolderIcon className="size-5" />
                        <span>التصنيفات</span>
                      </Link>
                    }
                    isActive={pathname.startsWith("/owner/categories")}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>الطلبات والطاولات</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/owner/orders" className="flex items-center gap-2">
                        <ClipboardListIcon className="size-5" />
                        <span>الطلبات</span>
                      </Link>
                    }
                    isActive={pathname.startsWith("/owner/orders")}
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/owner/customers" className="flex items-center gap-2">
                        <UsersIcon className="size-5" />
                        <span>العملاء والولاء</span>
                      </Link>
                    }
                    isActive={pathname.startsWith("/owner/customers")}
                  />
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/owner/tables" className="flex items-center gap-2">
                        <QrCodeIcon className="size-5" />
                        <span>الطاولات و QR</span>
                      </Link>
                    }
                    isActive={pathname.startsWith("/owner/tables")}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>الإعدادات</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={
                      <Link href="/owner/settings" className="flex items-center gap-2">
                        <SettingsIcon className="size-5" />
                        <span>الإعدادات</span>
                      </Link>
                    }
                    isActive={pathname.startsWith("/owner/settings")}
                  />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <SidebarTrigger className="md:hidden" />
          <h1 className="text-lg font-semibold text-foreground truncate">{restaurantName}</h1>
          <span className="hidden text-sm text-muted-foreground sm:inline">لوحة المطعم</span>
          <div className="ml-auto flex items-center gap-1">
            <OrderNotificationsBell restaurantId={restaurantId} variant="owner" />
            {livePreviewUrl && (
              <a
                href={livePreviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <SmartphoneIcon className="size-4" />
                معاينة المنيو
              </a>
            )}
            <ThemeToggle />
            <form action="/auth/signout" method="POST">
              <Button type="submit" variant="ghost" size="sm">
                تسجيل الخروج
              </Button>
            </form>
          </div>
        </header>
        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex-1 overflow-auto p-4 md:p-6"
        >
          {children}
        </motion.main>
      </SidebarInset>
    </SidebarProvider>
  );
}
