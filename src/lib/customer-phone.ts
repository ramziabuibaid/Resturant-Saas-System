/**
 * دمج مقدمة الدولة مع رقم الزبون المخزّن (أرقام فقط كما في الطلبات).
 * إذا كان الرقم يبدأ بالمقدمة نفسها يُعاد كما هو.
 * إذا بدأ بـ 0 يُزال قبل الدمج (صيغة محلية شائعة).
 */
export function normalizeInternationalDigits(
  countryPrefixDigits: string | null | undefined,
  customerStoredDigits: string
): string {
  const customer = customerStoredDigits.replace(/\D/g, "");
  const prefix = (countryPrefixDigits ?? "").replace(/\D/g, "");
  if (!prefix) return customer;
  if (customer.startsWith(prefix)) return customer;
  let local = customer;
  if (local.startsWith("0")) local = local.slice(1);
  return prefix + local;
}

/** عرض بسيط مع بادئة + */
export function formatInternationalPhoneDisplay(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d) return "";
  return `+${d}`;
}

export function buildPublicOrderTrackingUrl(
  publicBaseUrl: string,
  subdomain: string,
  trackingToken: string
): string {
  const base = publicBaseUrl.replace(/\/$/, "");
  const path = `/menu/${encodeURIComponent(subdomain)}/track/${trackingToken}`;
  if (!base) return path;
  return `${base}${path}`;
}

/** نص جاهز للزبون عبر واتساب (قبول + تحضير + رقم + رابط التتبع) */
export function buildWhatsAppOrderStaffMessage(params: {
  restaurantName: string;
  displayNumber: number;
  trackingUrl: string;
}): string {
  const name = params.restaurantName.trim() || "المطعم";
  return [
    `مرحباً، تم قبول طلبك في ${name}.`,
    "",
    `رقم الطلب: #${params.displayNumber}`,
    "طلبك قيد التحضير حالياً.",
    "",
    "🔗 متابعة الطلب:",
    params.trackingUrl,
  ].join("\n");
}

export function buildWhatsAppMeUrl(phoneDigits: string, text: string): string {
  const d = phoneDigits.replace(/\D/g, "");
  const q = encodeURIComponent(text);
  return `https://wa.me/${d}?text=${q}`;
}

export function buildTelHref(phoneDigits: string): string {
  const d = phoneDigits.replace(/\D/g, "");
  if (!d) return "#";
  return `tel:+${d}`;
}

/** رسالة واتساب لإبلاغ الزبون برصيد النقاط ورابط صفحة الولاء */
export function buildWhatsAppLoyaltyPointsMessage(params: {
  restaurantName: string;
  customerName?: string | null;
  pointsBalance: number;
  loyaltyPageUrl: string;
}): string {
  const place = params.restaurantName.trim() || "المطعم";
  const who = params.customerName?.trim() || "مرحباً";
  return [
    `${who}،`,
    `رصيد نقاطك في برنامج ولاء ${place}: ${params.pointsBalance} نقطة.`,
    "",
    "🔗 لمتابعة نقاطك وسجلّك:",
    params.loyaltyPageUrl,
  ].join("\n");
}
