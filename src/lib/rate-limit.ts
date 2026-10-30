/*
 * حد بسيط لعدد الطلبات في الذاكرة (نافذة منزلقة). يكفي لأن التطبيق يعمل كنسخة واحدة على السيرفر.
 * لو صار أكثر من نسخة لاحقاً: انقله إلى Postgres أو Redis.
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 10_000) {
    for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  }
  return true;
}

/** عنوان الزائر خلف Cloudflare / reverse proxy */
export function clientIp(h: Headers): string {
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "unknown"
  );
}
