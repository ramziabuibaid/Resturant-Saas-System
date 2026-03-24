import type { MenuItem } from "@/lib/types/database";

/**
 * سعر الصرف: عدد وحدات العملة الثانية (الكاملة) مقابل 1 وحدة من العملة الأساسية (الكاملة).
 * مثال: 1 USD = 3.7 ILS → القيمة 3.7
 */
export function secondaryCentsFromPrimaryCents(
  primaryCents: number,
  secondaryPerPrimaryUnit: number
): number {
  if (!Number.isFinite(secondaryPerPrimaryUnit) || secondaryPerPrimaryUnit <= 0) return 0;
  return Math.round(primaryCents * secondaryPerPrimaryUnit);
}

/**
 * يحدد سعر الوحدة بالعملة الثانية (بالسنت): يدوي إن وُجد، وإلا بالصرف عند توفره.
 */
export function resolveSecondaryUnitCents(
  item: MenuItem,
  primaryCents: number,
  priceOptionLabel: string | null,
  exchangeRate: number | null | undefined
): number | null {
  const opts = item.price_options;
  const hasOptions = Array.isArray(opts) && opts.length > 0;

  if (hasOptions && priceOptionLabel?.trim()) {
    const manual = item.secondary_price_options?.find((x) => x.label === priceOptionLabel)?.price_cents;
    if (typeof manual === "number" && manual >= 0) return manual;
  } else if (!hasOptions) {
    if (typeof item.secondary_price === "number" && item.secondary_price >= 0) {
      return item.secondary_price;
    }
  }

  const rate = exchangeRate;
  if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
    return secondaryCentsFromPrimaryCents(primaryCents, rate);
  }
  return null;
}
