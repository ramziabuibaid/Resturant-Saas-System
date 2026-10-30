"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { isSuperAdminRequest, UNAUTHORIZED } from "@/lib/auth/current-user";
import { hashPassword, MIN_PASSWORD_LENGTH } from "@/lib/auth/password";
import { destroyAllSessionsForUser } from "@/lib/auth/session";

const USERNAME_REGEX = /^[a-z0-9_-]{3,30}$/;

function ownerOf(restaurantId: string) {
  return and(eq(schema.users.restaurantId, restaurantId), eq(schema.users.role, "owner"));
}

/**
 * إنشاء أو تحديث بيانات دخول صاحب المطعم (اسم مستخدم + كلمة مرور). لمالك النظام فقط.
 */
export async function createOrUpdateOwnerCredentials(
  restaurantId: string,
  username: string,
  password: string
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  const uname = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(uname))
    return { error: "اسم المستخدم: حروف إنجليزية صغيرة، أرقام، شرطة أو شرطة سفلية (3–30)" };
  if (!password || password.length < MIN_PASSWORD_LENGTH)
    return { error: `كلمة المرور ${MIN_PASSWORD_LENGTH} أحرف على الأقل` };

  const passwordHash = await hashPassword(password);
  const [existing] = await db.select({ id: schema.users.id }).from(schema.users).where(ownerOf(restaurantId)).limit(1);

  try {
    if (existing) {
      await db.update(schema.users).set({ username: uname, passwordHash }).where(eq(schema.users.id, existing.id));
      await destroyAllSessionsForUser(existing.id);
    } else {
      await db.insert(schema.users).values({ username: uname, passwordHash, role: "owner", restaurantId });
    }
  } catch {
    return { error: "اسم المستخدم مستخدم في هذا المطعم" };
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
