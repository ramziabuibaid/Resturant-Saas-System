"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { isSuperAdminRequest, UNAUTHORIZED } from "@/lib/auth/current-user";
import { isSubdomainTaken, toRestaurantDto, validateSubdomain } from "@/lib/data/restaurants";
import type { Restaurant } from "@/lib/types/database";
import { PLANS, TRIAL_DAYS, type PlanId } from "@/lib/plans";

const DAY = 86_400_000;
const isPlan = (p: string): p is PlanId => p in PLANS;

export type CreateRestaurantInput = {
  name: string;
  subdomain: string;
  plan?: string;
};

export async function updateRestaurantSubdomain(
  restaurantId: string,
  newSubdomain: string
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  const sub = validateSubdomain(newSubdomain ?? "");
  if ("error" in sub) return { error: sub.error };
  if (await isSubdomainTaken(sub.value, restaurantId)) return { error: "النطاق الفرعي مستخدم لمطعم آخر" };

  await db
    .update(schema.restaurants)
    .set({ subdomain: sub.value })
    .where(eq(schema.restaurants.id, restaurantId));

  revalidatePath("/admin/restaurants");
  revalidatePath("/admin");
  return { error: null };
}

export async function createRestaurant(
  input: CreateRestaurantInput
): Promise<{ data: Restaurant | null; error: string | null }> {
  if (!(await isSuperAdminRequest())) return { data: null, error: UNAUTHORIZED };
  const name = input.name?.trim();
  if (!name) return { data: null, error: "اسم المطعم مطلوب" };
  const sub = validateSubdomain(input.subdomain ?? "");
  if ("error" in sub) return { data: null, error: sub.error };
  if (await isSubdomainTaken(sub.value)) return { data: null, error: "النطاق الفرعي مستخدم لمطعم آخر" };

  const [row] = await db
    .insert(schema.restaurants)
    .values({
      name,
      subdomain: sub.value,
      status: "trial",
      plan: input.plan && isPlan(input.plan) ? input.plan : "pro",
      trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY),
    })
    .returning();

  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { data: toRestaurantDto(row), error: null };
}

/** حذف المطعم وكل بياناته (الأصناف، الطلبات، الزبائن، حساب المالك…) عبر ON DELETE CASCADE */
export async function deleteRestaurant(id: string): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  await db.delete(schema.restaurants).where(eq(schema.restaurants.id, id));
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}

export async function updateRestaurantStatus(
  restaurantId: string,
  status: "active" | "trial" | "suspended"
): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  if (!["active", "trial", "suspended"].includes(status)) return { error: "حالة غير صالحة" };
  const [current] = await db
    .select({ trialEndsAt: schema.restaurants.trialEndsAt })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, restaurantId));
  if (!current) return { error: "المطعم غير موجود" };
  const updated = await db
    .update(schema.restaurants)
    // إعادة مطعم إلى «تجريبي» بدون تاريخ انتهاء تمنحه فترة تجربة كاملة
    .set(status === "trial" && !current.trialEndsAt ? { status, trialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY) } : { status })
    .where(eq(schema.restaurants.id, restaurantId))
    .returning({ id: schema.restaurants.id });
  if (!updated.length) return { error: "المطعم غير موجود" };
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
  return { error: null };
}

function revalidateSuper() {
  revalidatePath("/admin");
  revalidatePath("/admin/restaurants");
}

export async function updateRestaurantPlan(restaurantId: string, plan: string): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  if (!isPlan(plan)) return { error: "خطة غير صالحة" };
  const updated = await db
    .update(schema.restaurants)
    .set({ plan })
    .where(eq(schema.restaurants.id, restaurantId))
    .returning({ id: schema.restaurants.id });
  if (!updated.length) return { error: "المطعم غير موجود" };
  revalidateSuper();
  return { error: null };
}

/** تمديد التجربة: من تاريخ انتهائها الحالي أو من اليوم إن كانت منتهية */
export async function extendTrial(restaurantId: string, days: number): Promise<{ error: string | null }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  const d = Math.floor(Number(days) || 0);
  if (d < 1 || d > 365) return { error: "عدد أيام غير صالح" };
  const [r] = await db
    .select({ trialEndsAt: schema.restaurants.trialEndsAt })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, restaurantId));
  if (!r) return { error: "المطعم غير موجود" };
  const from = Math.max(Date.now(), r.trialEndsAt?.getTime() ?? 0);
  await db
    .update(schema.restaurants)
    .set({ status: "trial", trialEndsAt: new Date(from + d * DAY) })
    .where(eq(schema.restaurants.id, restaurantId));
  revalidateSuper();
  return { error: null };
}

/**
 * تسجيل دفعة يدوية (تحويل/نقدي): تفعّل المطعم وتمدّ الاشتراك من نهايته الحالية
 * (أو من اليوم إن كان منتهياً) بعدد الأشهر.
 */
export async function recordSubscriptionPayment(input: {
  restaurantId: string;
  plan: string;
  months: number;
  amountCents: number;
  note?: string | null;
}): Promise<{ error: string | null; paidUntil?: string }> {
  if (!(await isSuperAdminRequest())) return { error: UNAUTHORIZED };
  if (!isPlan(input.plan)) return { error: "خطة غير صالحة" };
  const months = Math.floor(Number(input.months) || 0);
  if (months < 1 || months > 36) return { error: "عدد الأشهر بين 1 و 36" };
  const amountCents = Math.round(Number(input.amountCents) || 0);
  if (amountCents < 0 || amountCents > 100_000_00) return { error: "المبلغ غير صالح" };
  const plan = input.plan;

  const periodEnd = await db.transaction(async (tx) => {
    const [r] = await tx
      .select({ paidUntil: schema.restaurants.paidUntil, status: schema.restaurants.status })
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, input.restaurantId))
      .for("update");
    if (!r) return null;
    // اشتراك نشط بلا انتهاء (null) أو منتهٍ يبدأ من اليوم
    const start = new Date(Math.max(Date.now(), r.status === "active" && r.paidUntil ? r.paidUntil.getTime() : 0));
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    await tx
      .update(schema.restaurants)
      .set({ status: "active", plan, paidUntil: end })
      .where(eq(schema.restaurants.id, input.restaurantId));
    await tx.insert(schema.subscriptionPayments).values({
      restaurantId: input.restaurantId,
      plan,
      months,
      amountCents,
      note: input.note?.trim().slice(0, 300) || null,
      periodEnd: end,
    });
    return end;
  });
  if (!periodEnd) return { error: "المطعم غير موجود" };
  revalidateSuper();
  return { error: null, paidUntil: periodEnd.toISOString() };
}
