import { headers, cookies } from "next/headers";
import { getIdentifiedRestaurant } from "@/lib/restaurant-headers";
import { getRestaurantBySubdomain } from "@/lib/data/restaurants";
import { subdomainFromHost } from "@/lib/tenant-host";

const ADMIN_TENANT_COOKIE = "admin_subdomain";

/** استنتاج المطعم في منطقة /admin: هيدرات، ثم cookie، ثم host. */
export async function resolveAdminTenant(): Promise<{
  id: string;
  subdomain: string;
} | null> {
  let tenant = await getIdentifiedRestaurant();
  if (tenant) return tenant;

  // إذا كان الدخول من الدومين الرئيسي (localhost:3000) يجب تجاهل cookie
  // وإرجاع null حتى لا نُعامل /admin كأنه لوحة مطعم.
  const h = await headers();
  const host = h.get("x-original-host") ?? h.get("host") ?? "";
  const sub = subdomainFromHost(host);
  if (!sub) return null;

  const cookieStore = await cookies();
  const subFromCookie = cookieStore.get(ADMIN_TENANT_COOKIE)?.value;
  if (subFromCookie) {
    try {
      tenant = await getRestaurantBySubdomain(decodeURIComponent(subFromCookie));
    } catch {
      // ignore
    }
  }
  if (tenant) return tenant;
  // fallback: نستخدم subdomain من الـ host مباشرة
  tenant = await getRestaurantBySubdomain(sub);
  return tenant;
}
