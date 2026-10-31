import { headers } from "next/headers";
import { requireSuperAdmin } from "@/lib/admin-context";
import { getPlatformOverview } from "@/lib/data/platform";
import { RestaurantsTable } from "./restaurants-table";

export const metadata = {
  title: "المطاعم | لوحة مالك النظام",
  description: "إدارة جميع المطاعم",
};

/** صفحة Super Admin فقط — عند الدخول من subdomain نوجّه إلى /admin */
export default async function AdminRestaurantsPage({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  await requireSuperAdmin();
  const [{ restaurants }, sp, h] = await Promise.all([getPlatformOverview(), searchParams, headers()]);

  return (
    <RestaurantsTable
      restaurants={restaurants}
      rootHost={(h.get("host") ?? "").replace(/^www\./, "")}
      proto={h.get("x-forwarded-proto") ?? "https"}
      openNew={sp.new === "1"}
    />
  );
}
