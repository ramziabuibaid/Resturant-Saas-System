import Link from "next/link";
import { getProfileOrRedirect } from "@/app/actions/auth";
import { getOwnerDashboardStats } from "@/app/actions/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardListIcon, FolderIcon, UtensilsCrossedIcon } from "lucide-react";
import { OwnerDashboardCharts } from "./owner-dashboard-charts";

const linkButtonClass =
  "inline-flex items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors";

export const metadata = {
  title: "نظرة عامة | لوحة المطعم",
  description: "نظرة عامة على القائمة والمطعم",
};

export default async function OwnerDashboardPage() {
  const profile = await getProfileOrRedirect();
  const stats = await getOwnerDashboardStats(profile.restaurant_id!);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">نظرة عامة</h1>
        <p className="text-muted-foreground">
          القائمة والمطعم في لمحة. إدارة التصنيفات والأصناف أدناه.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">التصنيفات</CardTitle>
            <FolderIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesCount}</div>
            <p className="text-xs text-muted-foreground">تصنيفات القائمة</p>
            <Link href="/owner/categories" className={linkButtonClass + " mt-4 block w-fit"}>
              إدارة التصنيفات
            </Link>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أصناف القائمة</CardTitle>
            <UtensilsCrossedIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.menuItemsCount}</div>
            <p className="text-xs text-muted-foreground">إجمالي الأصناف</p>
            <Link href="/owner/items" className={linkButtonClass + " mt-4 block w-fit"}>
              إدارة أصناف القائمة
            </Link>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-shadow hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">طلبات بانتظار المعالجة</CardTitle>
            <ClipboardListIcon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrdersCount}</div>
            <p className="text-xs text-muted-foreground">من طلبات المنيو والـ QR</p>
            <Link href="/owner/orders" className={linkButtonClass + " mt-4 block w-fit"}>
              عرض الطلبات
            </Link>
          </CardContent>
        </Card>
      </div>

      <OwnerDashboardCharts stats={stats} />
    </div>
  );
}
