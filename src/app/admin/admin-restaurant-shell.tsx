"use client";

import {
  LayoutDashboardIcon,
  FolderIcon,
  UtensilsCrossedIcon,
  SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout, type NavGroup } from "@/components/dashboard/DashboardLayout";

type AdminRestaurantShellProps = {
  restaurantName: string;
  livePreviewUrl: string | null;
  logoUrl?: string | null;
  profile?: { name?: string; imageUrl?: string | null; role?: string } | null;
  children: React.ReactNode;
};

function getRestaurantNavGroups(): NavGroup[] {
  return [
    {
      label: "إدارة القائمة",
      items: [
        { href: "/admin", label: "نظرة عامة", icon: <LayoutDashboardIcon /> },
        { href: "/admin/menu", label: "أصناف المنيو", icon: <UtensilsCrossedIcon /> },
        { href: "/admin/categories", label: "التصنيفات", icon: <FolderIcon /> },
      ],
    },
    {
      label: "الإعدادات",
      items: [
        { href: "/admin/settings", label: "الإعدادات", icon: <SettingsIcon /> },
      ],
    },
  ];
}

export function AdminRestaurantShell({
  restaurantName,
  livePreviewUrl,
  logoUrl,
  profile,
  children,
}: AdminRestaurantShellProps) {
  return (
    <DashboardLayout
      title={restaurantName}
      navGroups={getRestaurantNavGroups()}
      previewUrl={livePreviewUrl}
      logoUrl={logoUrl}
      profile={profile}
      headerRight={
        <form action="/auth/signout" method="POST">
          <Button type="submit" variant="ghost" size="sm">
            تسجيل الخروج
          </Button>
        </form>
      }
    >
      {children}
    </DashboardLayout>
  );
}
