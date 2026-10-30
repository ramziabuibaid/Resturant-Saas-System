import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function POST(request: Request) {
  await destroySession();
  // نبقى على نفس النطاق (مثلاً demo.example.com) — request.url قد يحمل host داخلياً مختلفاً
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/login`, { status: 303 });
}
