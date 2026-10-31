import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { createSession } from "@/lib/auth/session";
import { exchangeGoogleCode, GOOGLE_STATE_COOKIE, googleConfigured } from "@/lib/auth/google";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { googleRedirectBase } from "../base";

/**
 * عودة المستخدم من Google: نتحقق من state ثم نجد الحساب (بمعرّف Google ثم بالبريد)
 * أو ننشئ حساب صاحب مطعم جديد مفعّلاً مباشرة.
 */
export async function GET(req: NextRequest) {
  const base = googleRedirectBase(req);
  const fail = (code = "google") => {
    const res = NextResponse.redirect(new URL(`/login?error=${code}`, base));
    res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/auth/google" });
    return res;
  };

  if (!googleConfigured()) return fail("google_off");
  if (!rateLimit(`google:${clientIp(req.headers)}`, 20, 60_000)) return fail();

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const [savedState, verifier] = (req.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  if (!code || !state || !savedState || !verifier || state !== savedState) return fail();

  const identity = await exchangeGoogleCode({ code, verifier, redirectUri: `${base}/auth/google/callback` });
  if (!identity) return fail();

  let [user] = await db.select().from(schema.users).where(eq(schema.users.googleSub, identity.sub)).limit(1);
  if (!user) {
    const [byEmail] = await db.select().from(schema.users).where(eq(schema.users.email, identity.email)).limit(1);
    if (byEmail) {
      // البريد موثّق من Google: نربط الحساب الموجود (إلا إن كان مربوطاً بحساب Google آخر)
      if (byEmail.googleSub && byEmail.googleSub !== identity.sub) return fail();
      [user] = await db
        .update(schema.users)
        .set({ googleSub: identity.sub, fullName: byEmail.fullName ?? identity.name })
        .where(eq(schema.users.id, byEmail.id))
        .returning();
    } else {
      [user] = await db
        .insert(schema.users)
        .values({ email: identity.email, googleSub: identity.sub, fullName: identity.name, role: "owner" })
        .returning();
    }
  }

  await createSession(user.id);
  const next = user.role === "super_admin" || user.restaurantId ? "/admin" : "/complete-profile";
  const res = NextResponse.redirect(new URL(next, base));
  res.cookies.delete({ name: GOOGLE_STATE_COOKIE, path: "/auth/google" });
  return res;
}
