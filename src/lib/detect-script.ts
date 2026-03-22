/**
 * يتحقق من وجود حرف عربي في النص (يشمل العربية والفارسية والأوردو…).
 * يُستخدم لاختيار خط أو اتجاه مناسب في الواجهة.
 */
const ARABIC_SCRIPT =
  /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

export function hasArabicScript(text: string): boolean {
  return ARABIC_SCRIPT.test(text);
}
