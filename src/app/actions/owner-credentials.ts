"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { isSuperAdminRequest, UNAUTHORIZED } from "@/lib/auth/current-user";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { destroyAllSessionsForUser } from "@/lib/auth/session";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ownerOf(restaurantId: string) {
  return and(eq(schema.users.restaurantId, restaurantId), eq(schema.users.role, "owner"));
}

/**
 * إنشاء أو تحديث دخول صاحب المطعم (البريد + كلمة المرور). لمالك النظام فقط.
 * كلمة المرور اختيارية عند تعديل بريد حساب موجود.
 */
export async function createOrUpdateOwnerCredentials(
  restaurantId: string,
  emailRaw: string,
  password: string
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  const email = emailRaw.trim().toLowerCase();
  if (!EMAIL_REGEX.test(email)) return { error: "أدخل بريداً إلكترونياً صحيحاً" };
  if (password && password.length < MIN_PASSWORD_LENGTH)
    return { error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل` };

  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(ownerOf(restaurantId)).limit(1);
  if (!existing && !password) return { error: "كلمة المرور مطلوبة لحساب جديد" };

  try {
    if (existing) {
      await db
        .update(schema.users)
        .set({ email, ...(password ? { passwordHash: await hashPassword(password) } : {}) })
        .where(eq(schema.users.id, existing.id));
      if (password) await destroyAllSessionsForUser(existing.id);
    } else {
      await db.insert(schema.users).values({ email, passwordHash: await hashPassword(password), role: "owner", restaurantId });
    }
  } catch {
    return { error: "هذا البريد مستخدم لحساب آخر" };
  }

  revalidatePath("/admin/restaurants");
  return { error: null };
}

/** تغيير كلمة مرور صاحب المطعم فقط — ينهي كل جلساته المفتوحة */
export async function updateOwnerPassword(
  restaurantId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH)
    return { error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل` };

  const [owner] = await db.select({ id: schema.users.id }).from(schema.users).where(ownerOf(restaurantId)).limit(1);
  if (!owner) return { error: "لا يوجد مالك لهذا المطعم. أنشئ بيانات الدخول أولاً." };

  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(newPassword) })
    .where(eq(schema.users.id, owner.id));
  await destroyAllSessionsForUser(owner.id);
  return { error: null };
}
