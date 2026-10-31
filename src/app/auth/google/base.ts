import type { NextRequest } from "next/server";

/**
 * أصل روابط Google: APP_URL أو https://ROOT_DOMAIN في الإنتاج،
 * ومحلياً أصل الطلب نفسه (مثل http://localhost:3001) — يجب تسجيله في Google Console.
 */
export function googleRedirectBase(req: NextRequest): string {
  const fromEnv = process.env.APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  if (root) return `https://${root}`;
  return req.nextUrl.origin;
}
