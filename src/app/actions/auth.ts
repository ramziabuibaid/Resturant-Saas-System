"use server";

import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getSessionUser, createSession, destroySession, destroyAllSessionsForUser } from "@/lib/auth/session";
import {
  hashPassword,
  verifyPassword,
  verifyAgainstDummy,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";
import { isSubdomainTaken, validateSubdomain } from "@/lib/data/restaurants";
import { TRIAL_DAYS } from "@/lib/plans";
import { MENU_CURRENCIES } from "@/lib/currencies";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { appUrl } from "@/lib/app-url";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail, welcomeEmail } from "@/lib/email/templates";
import { buildTenantPublicSiteUrl } from "@/lib/tenant-public-url";

/*
 * كل دالة هنا endpoint عام. لا تُضف هنا قراءات تأخذ معرّفات — ضعها في src/lib/data.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const INVALID_LOGIN = "البريد أو كلمة المرور غير صحيحة";
const RESET_MINUTES = 60;

type Result = { error: string | null };

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * دخول موحّد بالبريد وكلمة المرور (لمالك النظام وأصحاب المطاعم).
 * الحسابات القديمة بلا بريد: اسم المستخدم في نفس الحقل —
 * على نطاق مطعم يُبحث داخل المطعم، وعلى الدومين الرئيسي بين مالكي النظام.
 * على نطاق مطعم لا يدخل إلا صاحب هذا المطعم.
 */
export async function signIn(identifier: string, password: string, tenantId?: string | null): Promise<Result> {
  const key = identifier.trim().toLowerCase();
  if (!key || !password) return { error: "البريد وكلمة المرور مطلوبان" };
  if (!rateLimit(`login:${clientIp(await headers())}`, 10, 60_000)) {
    return { error: "محاولات كثيرة، انتظر دقيقة ثم أعد المحاولة" };
  }

  let user: typeof schema.users.$inferSelect | undefined;
  if (key.includes("@")) {
    [user] = await db.select().from(schema.users).where(eq(schema.users.email, key)).limit(1);
  } else if (tenantId) {
    [user] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.restaurantId, tenantId), eq(schema.users.username, key)))
      .limit(1);
  } else {
    [user] = await db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.username, key), eq(schema.users.role, "super_admin"), isNull(schema.users.restaurantId)))
      .limit(1);
  }

  if (!user?.passwordHash) {
    await verifyAgainstDummy(password);
    return { error: INVALID_LOGIN };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { error: INVALID_LOGIN };
  if (tenantId && user.restaurantId !== tenantId) return { error: INVALID_LOGIN };

  await createSession(user.id);
  return { error: null };
}

/** تسجيل صاحب مطعم جديد بالبريد — يُفعّل مباشرة بلا رمز تأكيد، ثم يُوجَّه لإنشاء مطعمه */
export async function signUp(input: { email: string; password: string; fullName?: string }): Promise<Result> {
  const email = input.email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email) || email.length > 254) return { error: "أدخل بريداً إلكترونياً صحيحاً" };
  if (input.password.length < MIN_PASSWORD_LENGTH)
    return { error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل` };
  if (!rateLimit(`signup:${clientIp(await headers())}`, 5, 10 * 60_000)) {
    return { error: "محاولات كثيرة، انتظر قليلاً" };
  }

  const inserted = await db
    .insert(schema.users)
    .values({
      email,
      passwordHash: await hashPassword(input.password),
      fullName: input.fullName?.trim().slice(0, 80) || null,
      role: "owner",
    })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });
  if (!inserted[0]) return { error: "هذا البريد مسجّل مسبقاً — سجّل الدخول أو استعد كلمة المرور" };

  await createSession(inserted[0].id);
  return { error: null };
}

/**
 * طلب رابط استعادة كلمة المرور. الرد نفسه دائماً (لا نكشف إن كان البريد مسجّلاً).
 */
export async function requestPasswordReset(emailRaw: string): Promise<Result> {
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return { error: "أدخل بريداً إلكترونياً صحيحاً" };
  const ip = clientIp(await headers());
  if (!rateLimit(`reset:${ip}`, 5, 15 * 60_000) || !rateLimit(`reset-mail:${email}`, 3, 60 * 60_000)) {
    return { error: "طلبات كثيرة، حاول بعد قليل" };
  }

  const [user] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user) return { error: null };

  const token = randomBytes(32).toString("base64url");
  await db.insert(schema.passwordResetTokens).values({
    id: hashToken(token),
    userId: user.id,
    expiresAt: new Date(Date.now() + RESET_MINUTES * 60_000),
  });
  await sendEmail(passwordResetEmail(email, { url: appUrl(`/reset-password?token=${token}`), minutes: RESET_MINUTES }));
  return { error: null };
}

/** تعيين كلمة مرور جديدة من رابط الاستعادة — يُنهي كل الجلسات ثم يُدخله */
export async function resetPassword(token: string, password: string): Promise<Result> {
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل` };
  if (!token || token.length > 100) return { error: "الرابط غير صالح" };

  const userId = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(schema.passwordResetTokens.id, hashToken(token)),
          isNull(schema.passwordResetTokens.usedAt),
          gt(schema.passwordResetTokens.expiresAt, new Date())
        )
      )
      .returning({ userId: schema.passwordResetTokens.userId });
    if (!row) return null;
    await tx
      .update(schema.users)
      .set({ passwordHash: await hashPassword(password) })
      .where(eq(schema.users.id, row.userId));
    // أي روابط أخرى معلّقة لنفس الحساب تصبح لاغية
    await tx
      .update(schema.passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(and(eq(schema.passwordResetTokens.userId, row.userId), isNull(schema.passwordResetTokens.usedAt)));
    return row.userId;
  });
  if (!userId) return { error: "الرابط منتهي أو استُخدم من قبل — اطلب رابطاً جديداً" };

  await destroyAllSessionsForUser(userId);
  await createSession(userId);
  return { error: null };
}

/** إنشاء مطعم جديد وربط الحساب الحالي به (بداية الفترة التجريبية) */
export async function createRestaurantAndLink(payload: {
  name: string;
  subdomain: string;
  currencyCode?: string;
  /** عملة ثانية بسعر صرف — مثل الليرة عند التسعير بالدولار */
  secondaryCurrencyCode?: string;
  exchangeRate?: number | null;
}): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { error: "يجب تسجيل الدخول أولاً" };
  if (user.role !== "owner") return { error: "هذا الحساب لا يمكنه إنشاء مطعم" };
  if (user.restaurantId) return { error: "حسابك مرتبط بمطعم بالفعل" };

  const name = payload.name?.trim();
  if (!name || name.length < 2) return { error: "اسم المطعم يجب أن يكون حرفين على الأقل" };
  const sub = validateSubdomain(payload.subdomain ?? "");
  if ("error" in sub) return { error: sub.error };
  if (await isSubdomainTaken(sub.value)) return { error: "النطاق الفرعي مستخدم لمطعم آخر. اختر غيره." };

  const known = (c?: string) => (c && MENU_CURRENCIES.some((m) => m.code === c) ? c : null);
  const currencyCode = known(payload.currencyCode) ?? "USD";
  const secondaryCode = known(payload.secondaryCurrencyCode);
  if (secondaryCode && secondaryCode === currencyCode) return { error: "العملة الثانية يجب أن تختلف عن الأساسية" };
  const rate = Number(payload.exchangeRate);
  const hasRate = secondaryCode != null && Number.isFinite(rate) && rate > 0 && rate < 100_000_000;

  try {
    await db.transaction(async (tx) => {
      const [restaurant] = await tx
        .insert(schema.restaurants)
        .values({
          name,
          subdomain: sub.value,
          status: "trial",
          trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000),
          currencyCode,
          ...(secondaryCode
            ? {
                secondaryCurrencyEnabled: true,
                secondaryCurrencyCode: secondaryCode,
                secondaryCurrencyExchangeRate: hasRate ? String(rate) : null,
                // الليرة بأرقام كبيرة: تقريب لأقرب 5 وعرضها أولاً
                ...(secondaryCode === "SYP" ? { secondaryRoundStep: 5, showSecondaryFirst: true } : {}),
                ...(hasRate ? { pricesUpdatedAt: new Date() } : {}),
              }
            : {}),
        })
        .returning({ id: schema.restaurants.id });
      if (hasRate) {
        await tx
          .insert(schema.exchangeRateHistory)
          .values({ restaurantId: restaurant.id, currencyCode: secondaryCode!, rate: String(rate) });
      }
      await tx
        .update(schema.users)
        .set({ restaurantId: restaurant.id })
        .where(eq(schema.users.id, user.id));
    });
  } catch {
    // سباق نادر على نفس النطاق أو اسم المستخدم داخل المطعم
    return { error: "تعذر إنشاء المطعم، جرّب نطاقاً آخر" };
  }

  // رسالة الترحيب — لا تؤخر ولا تُفشل التسجيل
  if (user.email) {
    const h = await headers();
    const menuUrl = buildTenantPublicSiteUrl(sub.value, h.get("host") ?? "", h.get("x-forwarded-proto") ?? "https");
    void sendEmail(welcomeEmail(user.email, { name: user.fullName, restaurantName: name, menuUrl }));
  }

  revalidatePath("/admin");
  return { error: null };
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
