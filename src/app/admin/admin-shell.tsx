"use client";

import {
  LayoutDashboardIcon,
  Building2Icon,
  ShieldCheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardLayout, type NavGroup } from "@/components/dashboard/DashboardLayout";

const superAdminNavGroups: NavGroup[] = [
  {
    label: "النظام",
    items: [
      { href: "/admin", label: "نظرة عامة", icon: <LayoutDashboardIcon /> },
      { href: "/admin/restaurants", label: "المطاعم", icon: <Building2Icon /> },
    ],
  },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout
      title="لوحة مالك النظام"
      navGroups={superAdminNavGroups}
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
