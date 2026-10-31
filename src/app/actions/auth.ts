"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { getSessionUser, createSession, destroySession } from "@/lib/auth/session";
import {
  hashPassword,
  verifyPassword,
  verifyAgainstDummy,
  MIN_PASSWORD_LENGTH,
} from "@/lib/auth/password";
import { isSubdomainTaken, validateSubdomain } from "@/lib/data/restaurants";
import { TRIAL_DAYS } from "@/lib/plans";

/*
 * كل دالة هنا endpoint عام. لا تُضف هنا قراءات تأخذ معرّفات — ضعها في src/lib/data.
 */

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;
const INVALID_LOGIN = "بيانات الدخول غير صحيحة";

type Result = { error: string | null };

/** مالك النظام: البريد + كلمة المرور */
export async function signInWithEmailPassword(email: string, password: string): Promise<Result> {
  const key = email.trim().toLowerCase();
  if (!key || !password) return { error: "البريد وكلمة المرور مطلوبان" };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, key)).limit(1);
  if (!user || user.role !== "super_admin") {
    await verifyAgainstDummy(password);
    return { error: INVALID_LOGIN };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { error: INVALID_LOGIN };

  await createSession(user.id);
  return { error: null };
}

/** مالك النظام: اسم المستخدم + كلمة المرور (على الدومين الرئيسي) */
export async function signInSuperAdminWithUsernamePassword(
  username: string,
  password: string
): Promise<Result> {
  const uname = username.trim().toLowerCase();
  if (!uname || !password) return { error: "اسم المستخدم وكلمة المرور مطلوبان" };

  const [user] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.username, uname),
        eq(schema.users.role, "super_admin"),
        isNull(schema.users.restaurantId)
      )
    )
    .limit(1);
  if (!user) {
    await verifyAgainstDummy(password);
    return { error: INVALID_LOGIN };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { error: INVALID_LOGIN };

  await createSession(user.id);
  return { error: null };
}

/** صاحب المطعم: اسم المستخدم + كلمة المرور على نطاق مطعمه */
export async function signInWithUsernamePassword(
  restaurantId: string,
  username: string,
  password: string
): Promise<Result> {
  const uname = username.trim().toLowerCase();
  if (!uname || !password) return { error: "اسم المستخدم وكلمة المرور مطلوبان" };

  const [user] = await db
    .select()
    .from(schema.users)
    .where(and(eq(schema.users.restaurantId, restaurantId), eq(schema.users.username, uname)))
    .limit(1);
  if (!user) {
    await verifyAgainstDummy(password);
    return { error: INVALID_LOGIN };
  }
  if (!(await verifyPassword(password, user.passwordHash))) return { error: INVALID_LOGIN };

  await createSession(user.id);
  return { error: null };
}

/** تسجيل صاحب مطعم جديد (قبل إنشاء المطعم) — يدخل مباشرة ثم يُوجَّه لإنشاء مطعمه */
export async function signUpOwner(username: string, password: string): Promise<Result> {
  const uname = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(uname))
    return { error: "اسم المستخدم: حروف إنجليزية صغيرة، أرقام، شرطة أو شرطة سفلية فقط (3–30 حرفاً)" };
  if (password.length < MIN_PASSWORD_LENGTH)
    return { error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل` };

  const passwordHash = await hashPassword(password);
  const inserted = await db
    .insert(schema.users)
    .values({ username: uname, passwordHash, role: "owner" })
    .onConflictDoNothing()
    .returning({ id: schema.users.id });
  if (!inserted[0]) return { error: "اسم المستخدم مستخدم، اختر غيره" };

  await createSession(inserted[0].id);
  return { error: null };
}

/** إنشاء مطعم جديد وربط الحساب الحالي به (بداية الفترة التجريبية) */
export async function createRestaurantAndLink(payload: { name: string; subdomain: string }): Promise<Result> {
  const user = await getSessionUser();
  if (!user) return { error: "يجب تسجيل الدخول أولاً" };
  if (user.role !== "owner") return { error: "هذا الحساب لا يمكنه إنشاء مطعم" };
  if (user.restaurantId) return { error: "حسابك مرتبط بمطعم بالفعل" };

  const name = payload.name?.trim();
  if (!name || name.length < 2) return { error: "اسم المطعم يجب أن يكون حرفين على الأقل" };
  const sub = validateSubdomain(payload.subdomain ?? "");
  if ("error" in sub) return { error: sub.error };
  if (await isSubdomainTaken(sub.value)) return { error: "النطاق الفرعي مستخدم لمطعم آخر. اختر غيره." };

  try {
    await db.transaction(async (tx) => {
      const [restaurant] = await tx
        .insert(schema.restaurants)
        .values({ name, subdomain: sub.value, status: "trial", trialEndsAt: new Date(Date.now() + TRIAL_DAYS * 86_400_000) })
        .returning({ id: schema.restaurants.id });
      await tx
        .update(schema.users)
        .set({ restaurantId: restaurant.id })
        .where(eq(schema.users.id, user.id));
    });
  } catch {
    // سباق نادر على نفس النطاق أو اسم المستخدم داخل المطعم
    return { error: "تعذر إنشاء المطعم، جرّب نطاقاً آخر" };
  }

  revalidatePath("/admin");
  return { error: null };
}

export async function signOut() {
  await destroySession();
  redirect("/login");
}
