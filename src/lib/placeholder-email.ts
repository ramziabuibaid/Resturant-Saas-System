/**
 * للزائر الجديد: تسجيل بدون إيميل حقيقي.
 * نولّد بريداً داخلياً من اسم المستخدم لاستخدامه في Supabase Auth فقط.
 * يجب استخدام نطاق بصيغة بريد مقبولة (مثلاً example.com محجوز في RFC ولا يُستخدم للبريد الحقيقي).
 */
const PLACEHOLDER_DOMAIN = "users.example.com";

/** اسم المستخدم → بريد داخلي (حروف صغيرة، أرقام وشرطة سفلية فقط) */
export function getPlaceholderEmail(username: string): string {
  const safe = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "");
  return safe ? `${safe}@${PLACEHOLDER_DOMAIN}` : `guest@${PLACEHOLDER_DOMAIN}`;
}

/** التحقق من أن البريد من نوع placeholder (للمنطق الداخلي إن لزم) */
export function isPlaceholderEmail(email: string): boolean {
  return typeof email === "string" && email.endsWith(`@${PLACEHOLDER_DOMAIN}`);
}
