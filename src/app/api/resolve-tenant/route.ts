import { NextRequest, NextResponse } from "next/server";
import { getRestaurantBySubdomain } from "@/lib/data/restaurants";
import { subdomainFromHost } from "@/lib/tenant-host";

/**
 * يحلّ المطعم من الـ host (لصفحة تسجيل الدخول على النطاق الفرعي).
 * GET /api/resolve-tenant?hostname=mankal.localhost
 */
export async function GET(request: NextRequest) {
  const hostname =
    request.nextUrl.searchParams.get("hostname") ?? request.headers.get("host") ?? "";
  const sub = subdomainFromHost(hostname);
  if (!sub) {
    return NextResponse.json({ tenant: null });
  }
  const tenant = await getRestaurantBySubdomain(sub);
  return NextResponse.json({ tenant });
}
