"use client";

import {
  LayoutDashboardIcon,
  FolderIcon,
  UtensilsCrossedIcon,
  SettingsIcon,
  QrCodeIcon,
  ClipboardListIcon,
  UsersIcon,
} from "lucide-react";
import { DashboardLayout, type NavGroup } from "@/components/dashboard/DashboardLayout";

type AdminRestaurantShellProps = {
  restaurantName: string;
  /** لاشتراك إشعارات الطلبات الفورية */
  restaurantId: string | null;
  livePreviewUrl: string | null;
  logoUrl?: string | null;
  profile?: { name?: string; imageUrl?: string | null; role?: string } | null;
  children: React.ReactNode;
};

function getRestaurantNavGroups(): NavGroup[] {
  return [
    {
      label: "التشغيل",
      items: [
        { href: "/admin", label: "نظرة عامة", icon: <LayoutDashboardIcon />, mobile: true },
        { href: "/admin/orders", label: "الطلبات", icon: <ClipboardListIcon />, mobile: true },
        { href: "/admin/tables", label: "الطاولات و QR", icon: <QrCodeIcon /> },
      ],
    },
    {
      label: "المنيو",
      items: [
        { href: "/admin/menu", label: "المنيو", icon: <UtensilsCrossedIcon />, mobile: true },
        { href: "/admin/categories", label: "التصنيفات", icon: <FolderIcon /> },
      ],
    },
    {
      label: "الزبائن",
      items: [{ href: "/admin/customers", label: "العملاء", icon: <UsersIcon />, mobile: true }],
    },
    {
      label: "المطعم",
      items: [{ href: "/admin/settings", label: "الإعدادات", icon: <SettingsIcon /> }],
    },
  ];
}

export function AdminRestaurantShell({
  restaurantName,
  restaurantId,
  livePreviewUrl,
  logoUrl,
  profile,
  children,
}: AdminRestaurantShellProps) {
  return (
    <DashboardLayout
      title={restaurantName}
      navGroups={getRestaurantNavGroups()}
      notificationRestaurantId={restaurantId}
      previewUrl={livePreviewUrl}
      logoUrl={logoUrl}
      profile={profile}
    >
      {children}
    </DashboardLayout>
  );
}
