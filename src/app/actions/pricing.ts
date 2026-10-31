"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import { MENU_CURRENCIES } from "@/lib/currencies";
import { ROUND_STEPS, roundToStep } from "@/lib/secondary-currency";
import type { PriceOption } from "@/lib/types/database";

/*
 * التسعير اليومي: سعر الصرف، التقريب، والتحديث الجماعي للأسعار.
 * المطعم يُؤخذ دائماً من الجلسة.
 */

const MAX_CENTS = 100_000_000;

async function restaurantIdOrFail() {
  const { restaurant_id } = await getProfileOrRedirect();
  return restaurant_id!;
}

async function revalidatePricing(restaurantId: string) {
  const [r] = await db
    .select({ subdomain: schema.restaurants.subdomain })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, restaurantId));
  revalidatePath("/admin");
  revalidatePath("/admin/menu");
  revalidatePath("/admin/settings");
  if (r?.subdomain) revalidatePath(`/menu/${r.subdomain}`);
}

/**
 * سعر الصرف اليوم: يحدّث كل أسعار العملة الثانية المحسوبة تلقائياً (الأسعار اليدوية تبقى كما هي).
 * عند تمرير currencyCode لأول مرة تُفعَّل العملة الثانية.
 */
export async function updateExchangeRate(input: {
  rate: number;
  currencyCode?: string;
  roundStep?: number;
  showSecondaryFirst?: boolean;
}): Promise<{ error: string | null }> {
  const rid = await restaurantIdOrFail();
  const rate = Number(input.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100_000_000) return { error: "سعر الصرف غير صالح" };

  const [r] = await db
    .select({
      currencyCode: schema.restaurants.currencyCode,
      secondaryCode: schema.restaurants.secondaryCurrencyCode,
      secondaryOn: schema.restaurants.secondaryCurrencyEnabled,
      oldRate: schema.restaurants.secondaryCurrencyExchangeRate,
    })
    .from(schema.restaurants)
    .where(eq(schema.restaurants.id, rid));
  if (!r) return { error: "المطعم غير موجود" };

  const code = (input.currencyCode ?? r.secondaryCode ?? "").trim().toUpperCase();
  if (!MENU_CURRENCIES.some((c) => c.code === code)) return { error: "اختر العملة الثانية" };
  if (code === r.currencyCode) return { error: "العملة الثانية يجب أن تختلف عن الأساسية" };

  const step = input.roundStep == null ? undefined : Number(input.roundStep);
  if (step != null && !(ROUND_STEPS as readonly number[]).includes(step)) return { error: "قيمة التقريب غير صالحة" };

  const rateChanged = !r.secondaryOn || r.secondaryCode !== code || Math.abs(Number(r.oldRate) - rate) > Number(r.oldRate) * 1e-6;

  await db.transaction(async (tx) => {
    await tx
      .update(schema.restaurants)
      .set({
        secondaryCurrencyEnabled: true,
        secondaryCurrencyCode: code,
        secondaryCurrencyExchangeRate: String(rate),
        ...(step != null ? { secondaryRoundStep: step } : {}),
        ...(input.showSecondaryFirst != null ? { showSecondaryFirst: input.showSecondaryFirst === true } : {}),
        ...(rateChanged ? { pricesUpdatedAt: new Date() } : {}),
      })
      .where(eq(schema.restaurants.id, rid));
    if (rateChanged) {
      await tx.insert(schema.exchangeRateHistory).values({ restaurantId: rid, currencyCode: code, rate: String(rate) });
    }
  });

  await revalidatePricing(rid);
  return { error: null };
}

/** خيارات العرض فقط (التقريب وترتيب العملتين) بدون تغيير سعر الصرف */
export async function updatePriceDisplay(input: {
  roundStep: number;
  showSecondaryFirst: boolean;
}): Promise<{ error: string | null }> {
  const rid = await restaurantIdOrFail();
  const step = Number(input.roundStep);
  if (!(ROUND_STEPS as readonly number[]).includes(step)) return { error: "قيمة التقريب غير صالحة" };
  await db
    .update(schema.restaurants)
    .set({ secondaryRoundStep: step, showSecondaryFirst: input.showSecondaryFirst === true })
    .where(eq(schema.restaurants.id, rid));
  await revalidatePricing(rid);
  return { error: null };
}

function scale(cents: number, factor: number, roundCents: number) {
  const v = Math.round(cents * factor);
  const rounded = roundCents > 0 ? Math.max(roundCents, Math.round(v / roundCents) * roundCents) : v;
  return Math.min(MAX_CENTS, Math.max(0, rounded));
}

/**
 * رفع/خفض الأسعار بنسبة مئوية لكل المنيو أو لتصنيف واحد — يشمل الأحجام والأسعار الثانية اليدوية.
 * roundTo: تقريب الناتج بالوحدة الكاملة للعملة الأساسية (مثل 0.25 دولار)، 0 = بلا تقريب.
 */
export async function bulkAdjustPrices(input: {
  categoryId: string | null;
  percent: number;
  roundTo: number;
}): Promise<{ error: string | null; updated?: number }> {
  const rid = await restaurantIdOrFail();
  const percent = Number(input.percent);
  if (!Number.isFinite(percent) || percent === 0 || percent < -90 || percent > 500) {
    return { error: "النسبة بين −90٪ و 500٪" };
  }
  const roundCents = Math.round(Math.max(0, Number(input.roundTo) || 0) * 100);
  const factor = 1 + percent / 100;

  const where = input.categoryId
    ? and(eq(schema.menuItems.restaurantId, rid), eq(schema.menuItems.categoryId, input.categoryId))
    : eq(schema.menuItems.restaurantId, rid);
  const items = await db
    .select({
      id: schema.menuItems.id,
      price: schema.menuItems.price,
      priceOptions: schema.menuItems.priceOptions,
      secondaryPrice: schema.menuItems.secondaryPrice,
      secondaryPriceOptions: schema.menuItems.secondaryPriceOptions,
    })
    .from(schema.menuItems)
    .where(where);
  if (!items.length) return { error: "لا توجد أصناف لتعديلها" };

  await db.transaction(async (tx) => {
    for (const it of items) {
      await tx
        .update(schema.menuItems)
        .set({
          price: scale(it.price, factor, roundCents),
          priceOptions: it.priceOptions?.map((o) => ({ ...o, price_cents: scale(o.price_cents, factor, roundCents) })) ?? null,
          // الأسعار الثانية اليدوية تُرفع بنفس النسبة دون تقريب العملة الأساسية
          secondaryPrice: it.secondaryPrice == null ? null : scale(it.secondaryPrice, factor, 0),
          secondaryPriceOptions:
            it.secondaryPriceOptions?.map((o) => ({ ...o, price_cents: scale(o.price_cents, factor, 0) })) ?? null,
        })
        .where(eq(schema.menuItems.id, it.id));
    }
    await tx.update(schema.restaurants).set({ pricesUpdatedAt: new Date() }).where(eq(schema.restaurants.id, rid));
  });

  await revalidatePricing(rid);
  return { error: null, updated: items.length };
}

/** جدول الأسعار السريع: حفظ الأسعار المعدّلة فقط (سعر واحد أو أسعار الأحجام) */
export async function bulkSetPrices(
  rows: { id: string; price?: number; priceOptions?: PriceOption[] }[]
): Promise<{ error: string | null; updated?: number }> {
  const rid = await restaurantIdOrFail();
  if (!Array.isArray(rows) || rows.length === 0) return { error: null, updated: 0 };
  if (rows.length > 1000) return { error: "عدد كبير من الأصناف" };

  const valid = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= MAX_CENTS;
  for (const r of rows) {
    if (r.price != null && !valid(r.price)) return { error: "سعر غير صالح" };
    if (r.priceOptions && !r.priceOptions.every((o) => o.label?.trim() && valid(o.price_cents))) return { error: "سعر حجم غير صالح" };
  }

  // كل الأصناف يجب أن تخص هذا المطعم
  const ids = [...new Set(rows.map((r) => r.id))];
  const owned = await db
    .select({ id: schema.menuItems.id })
    .from(schema.menuItems)
    .where(and(eq(schema.menuItems.restaurantId, rid), inArray(schema.menuItems.id, ids)));
  if (owned.length !== ids.length) return { error: "صنف غير موجود" };

  await db.transaction(async (tx) => {
    for (const r of rows) {
      await tx
        .update(schema.menuItems)
        .set({
          ...(r.price != null ? { price: r.price } : {}),
          ...(r.priceOptions ? { priceOptions: r.priceOptions.map((o) => ({ label: o.label.trim(), price_cents: o.price_cents })) } : {}),
        })
        .where(and(eq(schema.menuItems.id, r.id), eq(schema.menuItems.restaurantId, rid)));
    }
    await tx.update(schema.restaurants).set({ pricesUpdatedAt: new Date() }).where(eq(schema.restaurants.id, rid));
  });

  await revalidatePricing(rid);
  return { error: null, updated: rows.length };
}
