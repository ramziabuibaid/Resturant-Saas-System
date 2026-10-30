import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { subdomainFromHost } from "@/lib/tenant-host";

/**
 * يحلّ المطعم من الـ host (لصفحة تسجيل الدخول على النطاق الفرعي).
 * GET /api/resolve-tenant?hostname=mankal.localhost
 * يتطلب تشغيل سياسة RLS "Public can read restaurants" (ملف supabase/migrations/0001_rls-public-menu.sql).
 */
export async function GET(request: NextRequest) {
  const hostname =
    request.nextUrl.searchParams.get("hostname") ?? request.headers.get("host") ?? "";
  const sub = subdomainFromHost(hostname);
  if (!sub) {
    return NextResponse.json({ tenant: null });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("restaurants")
    .select("id, subdomain")
    .ilike("subdomain", sub)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ tenant: null });
  }
  return NextResponse.json({
    tenant: { id: data.id, subdomain: data.subdomain },
  });
}
