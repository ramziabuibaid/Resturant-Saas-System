/**
 * رابط الموقع العام للمطعم (المنيو، QR).
 *
 * عند فتح لوحة التحكم من النطاق الفرعي (مثل alking.resturant.app)، تكون قيمة
 * `Host` هي بالفعل `subdomain` + النطاق الأساسي — لا نكرر الـ subdomain في الرابط.
 */
export function buildTenantPublicSiteUrl(
  subdomain: string | null | undefined,
  hostHeader: string,
  proto: string
): string {
  if (!subdomain?.trim() || !hostHeader.trim()) return "";
  const sub = subdomain.trim().toLowerCase();
  const raw = hostHeader.trim();
  const hostnameOnly = raw.split(":")[0].toLowerCase();

  if (hostnameOnly === sub || hostnameOnly.startsWith(`${sub}.`)) {
    return `${proto}://${raw}`.replace(/\/$/, "");
  }

  return `${proto}://${sub}.${raw}`.replace(/\/$/, "");
}
