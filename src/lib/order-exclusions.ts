/** فصل المكوّنات المذكورة من الزبون (فاصلة إنجليزية أو عربية) */
const SPLIT = /[,،]+/;

export function parseExcludedIngredients(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(SPLIT).map((s) => s.trim().slice(0, 120));
  const out: string[] = [];
  for (const p of parts) {
    if (p) out.push(p);
    if (out.length >= 25) break;
  }
  return out;
}

/** للتحقق من السيرفر */
export function normalizeExcludedForDb(input: unknown): { ok: true; value: string[] } | { ok: false } {
  if (input == null) return { ok: true, value: [] };
  if (!Array.isArray(input)) return { ok: false };
  const value: string[] = [];
  for (const x of input) {
    if (typeof x !== "string") return { ok: false };
    const t = x.trim().slice(0, 120);
    if (t) value.push(t);
    if (value.length > 25) return { ok: false };
  }
  return { ok: true, value };
}
