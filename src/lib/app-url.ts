/*
 * روابط مطلقة للمنصة (في البريد ومسار Google) — حيث لا يوجد طلب نقرأ منه الـ host.
 * APP_URL يتقدّم، ثم https://NEXT_PUBLIC_ROOT_DOMAIN، ثم localhost للتطوير.
 */
export function appUrl(path = ""): string {
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim();
  const base = (process.env.APP_URL?.trim() || (root ? `https://${root}` : "http://localhost:3000")).replace(/\/$/, "");
  return `${base}${path}`;
}

/** رقم واتساب الدعم (أرقام فقط) أو "" */
export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP?.replace(/\D/g, "") ?? "";

export function supportWhatsAppUrl(text: string): string | null {
  return SUPPORT_WHATSAPP ? `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}` : null;
}
