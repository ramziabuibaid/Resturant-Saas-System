import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE, googleAuthUrl, googleConfigured, newOAuthState } from "@/lib/auth/google";
import { googleRedirectBase } from "./base";

/** بداية الدخول عبر Google — يُحوَّل دائماً إلى الدومين الرئيسي */
export async function GET(req: NextRequest) {
  const base = googleRedirectBase(req);
  if (!googleConfigured()) return NextResponse.redirect(new URL("/login?error=google_off", base));

  // من نطاق مطعم: نكمل على الدومين الرئيسي حتى يُضبط الكوكي هناك
  // خلف النفق يرى التطبيق عنوانه الداخلي في nextUrl، فنقارن بالـ Host الذي أرسله المتصفح
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  if (new URL(base).host !== host) return NextResponse.redirect(new URL("/auth/google", base));

  const { state, verifier, challenge } = newOAuthState();
  const res = NextResponse.redirect(googleAuthUrl({ redirectUri: `${base}/auth/google/callback`, state, challenge }));
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/google",
    maxAge: 600,
  });
  return res;
}
