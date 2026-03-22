/**
 * العملات المتاحة لصاحب المطعم لعرض الأسعار في المنيو.
 * الشعار هو الرمز المستخدم رسمياً في كل بلد.
 */
export const MENU_CURRENCIES = [
  { code: "ILS", labelAr: "شيكل", symbol: "₪" },
  { code: "SYP", labelAr: "ليرة سورية", symbol: "ل.س" },
  { code: "JOD", labelAr: "دينار أردني", symbol: "د.أ" },
  { code: "SAR", labelAr: "ريال سعودي", symbol: "﷼" },
  { code: "USD", labelAr: "دولار أمريكي", symbol: "$" },
  { code: "AED", labelAr: "درهم إماراتي", symbol: "د.إ" },
  { code: "KWD", labelAr: "دينار كويتي", symbol: "د.ك" },
  { code: "IQD", labelAr: "دينار عراقي", symbol: "ع.د" },
  { code: "LBP", labelAr: "ليرة لبنانية", symbol: "ل.ل" },
] as const;

export type MenuCurrencyCode = (typeof MENU_CURRENCIES)[number]["code"];

/** شعار العملة حسب الرمز (المستخدم في البلد) */
const CURRENCY_SYMBOLS: Record<string, string> = Object.fromEntries(
  MENU_CURRENCIES.map((c) => [c.code, c.symbol])
);

/**
 * تنسيق مبلغ (بالسنت) بعملة المطعم:
 * - شعار العملة المستخدم في البلد (لا النص مثل ر.س)
 * - أرقام إنجليزية دائماً (0-9)
 */
export function formatMenuPrice(cents: number, currencyCode: string): string {
  const code =
    currencyCode && MENU_CURRENCIES.some((c) => c.code === currencyCode)
      ? currencyCode
      : "SAR";
  const symbol = CURRENCY_SYMBOLS[code] ?? "﷼";
  const value = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${symbol}`;
}
