import { NextResponse, type NextRequest } from "next/server";
import { findRestaurantByHost } from "@/lib/data/restaurants";
import { parseTenantHost, type HostTenant } from "@/lib/tenant-host";

/** Request header names set when middleware identifies a restaurant (rewritten route can read these) */
const RESTAURANT_HEADERS = {
  ID: "x-restaurant-id",
  SUBDOMAIN: "x-restaurant-subdomain",
  /** الـ host الأصلي (مثل mankal.localhost:3000) لاستخدامه في صفحة تسجيل الدخول إن لم تُقرأ الهيدرات الأخرى */
  ORIGINAL_HOST: "x-original-host",
} as const;

/**
 * Middleware: identifies the restaurant from the host and routes the request.
 *
 * 1. parseTenantHost: platform host, restaurant subdomain, or restaurant custom domain.
 * 2. Looks the restaurant up in Supabase (cached per instance for a short time).
 * 3. App routes (/admin, /login, /auth, …) continue with x-restaurant-* headers;
 *    everything else on a restaurant host renders that restaurant's menu.
 */

type CachedRestaurant = { id: string; subdomain: string; logo_url: string | null } | null;

const CACHE_TTL_MS = 60_000;
const restaurantCache = new Map<string, { value: CachedRestaurant; expires: number }>();

async function findRestaurant(tenant: Exclude<HostTenant, { kind: "platform" }>) {
  const key = tenant.kind === "subdomain" ? `s:${tenant.subdomain}` : `d:${tenant.domain}`;
  const hit = restaurantCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;

  let value: CachedRestaurant;
  try {
    value = await findRestaurantByHost(
      tenant.kind === "subdomain" ? { subdomain: tenant.subdomain } : { customDomain: tenant.domain }
    );
  } catch {
    // لا نخزّن الأخطاء المؤقتة — فقط النتيجة (موجود / غير موجود)
    return null;
  }
  restaurantCache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

/** مسارات التطبيق التي تعمل على نطاق المطعم كما هي (مع هيدرات المطعم) */
const TENANT_APP_PREFIXES = [
  "/admin",
  "/login",
  "/auth",
  "/forbidden",
  "/complete-profile",
  "/loyalty",
  "/uploads",
];

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export async function proxy(request: NextRequest) {
  // ترويسة Host الأصلية — nextUrl.hostname قد يُطبَّع إلى localhost خلف بعض الخوادم
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const tenant = parseTenantHost(host);
  if (tenant.kind === "platform") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  // Don't rewrite if we're already on a rewritten path or static/API routes
  if (
    pathname.startsWith("/menu/") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  try {
    const restaurant = await findRestaurant(tenant);
    if (!restaurant) {
      return NextResponse.next();
    }

    const logoUrl = restaurant.logo_url?.trim() ?? "";
    if (
      logoUrl &&
      (pathname === "/favicon.ico" ||
        pathname === "/apple-touch-icon.png" ||
        pathname === "/apple-touch-icon-precomposed.png")
    ) {
      return NextResponse.redirect(logoUrl, 302);
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set(RESTAURANT_HEADERS.ID, restaurant.id);
    requestHeaders.set(RESTAURANT_HEADERS.SUBDOMAIN, restaurant.subdomain);
    requestHeaders.set(RESTAURANT_HEADERS.ORIGINAL_HOST, host);

    if (TENANT_APP_PREFIXES.some((p) => matchesPrefix(pathname, p))) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // أي مسار آخر على نطاق المطعم → منيو المطعم كموقع مستقل
    const menuUrl = new URL(
      `/menu/${encodeURIComponent(restaurant.subdomain)}${url.search}`,
      request.url
    );
    return NextResponse.rewrite(menuUrl, { request: { headers: requestHeaders } });
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and images.
     */
    "/((?!_next/static|_next/image|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
