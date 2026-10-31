"use client";

import {
  LayoutDashboardIcon,
  Building2Icon,
} from "lucide-react";
import { DashboardLayout, type NavGroup } from "@/components/dashboard/DashboardLayout";

const superAdminNavGroups: NavGroup[] = [
  {
    label: "النظام",
    items: [
      { href: "/admin", label: "نظرة عامة", icon: <LayoutDashboardIcon />, mobile: true },
      { href: "/admin/restaurants", label: "المطاعم", icon: <Building2Icon />, mobile: true },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      title="مالك النظام"
      navGroups={superAdminNavGroups}
    >
      {children}
    </DashboardLayout>
  );
}
