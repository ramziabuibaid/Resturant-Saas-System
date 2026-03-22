import type { MenuItem, PriceOption } from "@/lib/types/database";

export type ResolvePriceResult =
  | { ok: true; cents: number }
  | { ok: false; needsOption: true };

/** يحدد سعر الوحدة بالسنت من الصنف وخيار الحجم إن وُجد */
export function resolveUnitPriceCents(
  item: MenuItem,
  priceOptionLabel?: string | null
): ResolvePriceResult {
  const opts = item.price_options;
  if (opts && Array.isArray(opts) && opts.length > 0) {
    if (!priceOptionLabel?.trim()) return { ok: false, needsOption: true };
    const o = opts.find((x: PriceOption) => x.label === priceOptionLabel);
    if (!o) return { ok: false, needsOption: true };
    return { ok: true, cents: o.price_cents };
  }
  return { ok: true, cents: item.price };
}
