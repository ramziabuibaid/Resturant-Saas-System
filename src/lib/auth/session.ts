import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * جلسات الدخول: رمز عشوائي في كوكي httpOnly، وقاعدة البيانات تحفظ SHA-256 له فقط
 * (لو تسرّبت القاعدة لا يمكن استعمال الجلسات منها).
 *
 * الكوكي مربوط بالنطاق الحالي فقط: الدخول على alking.example.com لا يمنح جلسة على مطعم آخر.
 */

export const SESSION_COOKIE = "rs_session";
const SESSION_DAYS = 30;
/** نجدد الجلسة إذا بقي أقل من هذا على انتهائها */
const RENEW_WITHIN_DAYS = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function writeCookie(token: string, expiresAt: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** يُستدعى من server action أو route handler فقط (تعديل الكوكي غير مسموح أثناء رسم الصفحة) */
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 300) ?? null;

  await db.insert(schema.sessions).values({ id: hashToken(token), userId, expiresAt, userAgent });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, userId));
  await writeCookie(token, expiresAt);

  // تنظيف الجلسات المنتهية بين حين وآخر
  if (Math.random() < 0.05) {
    await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
  }
}

export type SessionUser = typeof schema.users.$inferSelect;

/** المستخدم الحالي أو null — مخزّن لكل طلب (cache) فلا يتكرر الاستعلام */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: schema.users, expiresAt: schema.sessions.expiresAt })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
});

/** تمديد الجلسة النشطة — من server action فقط */
export async function renewSessionIfNeeded() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  const id = hashToken(token);
  const [s] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
  if (!s || s.expiresAt.getTime() - Date.now() > RENEW_WITHIN_DAYS * DAY_MS) return;
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY_MS);
  await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, id));
  await writeCookie(token, expiresAt);
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

/** بعد تغيير كلمة المرور: إنهاء كل جلسات المستخدم */
export async function destroyAllSessionsForUser(userId: string) {
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
}
