import { appUrl, supportWhatsAppUrl } from "@/lib/app-url";
import type { EmailMessage } from "@/lib/email/send";

/*
 * قوالب البريد — HTML بسيط بأنماط مضمّنة (عملاء البريد لا يدعمون CSS خارجياً)، من اليمين لليسار.
 */

const BRAND = "#d9440f";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

type Block = { heading: string; paragraphs: string[]; button?: { label: string; url: string }; footnote?: string };

function layout(to: string, subject: string, b: Block): EmailMessage {
  const support = supportWhatsAppUrl("مرحباً، أحتاج مساعدة في منيو");
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f5f1ee;font-family:Tahoma,Arial,sans-serif;color:#1c1917">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden" dir="rtl">
<tr><td style="padding:24px 28px;border-bottom:1px solid #eee">
<span style="display:inline-block;width:34px;height:34px;line-height:34px;border-radius:10px;background:${BRAND};color:#fff;text-align:center;font-weight:bold">م</span>
<span style="font-size:18px;font-weight:bold;vertical-align:middle;margin-right:8px">منيو</span>
</td></tr>
<tr><td style="padding:28px 28px 8px;text-align:right">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.4">${esc(b.heading)}</h1>
${b.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#44403c">${esc(p)}</p>`).join("")}
${
  b.button
    ? `<p style="margin:24px 0"><a href="${esc(b.button.url)}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 26px;border-radius:12px">${esc(b.button.label)}</a></p>`
    : ""
}
${b.footnote ? `<p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:#78716c">${esc(b.footnote)}</p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px 26px;font-size:12px;line-height:1.7;color:#a8a29e;text-align:right">
${support ? `تحتاج مساعدة؟ <a href="${esc(support)}" style="color:${BRAND}">راسلنا على واتساب</a><br>` : ""}
<a href="${esc(appUrl())}" style="color:#a8a29e">${esc(appUrl().replace(/^https?:\/\//, ""))}</a>
</td></tr></table></td></tr></table></body></html>`;
  const text = [b.heading, "", ...b.paragraphs, ...(b.button ? ["", `${b.button.label}: ${b.button.url}`] : []), ...(b.footnote ? ["", b.footnote] : [])].join("\n");
  return { to, subject, html, text };
}

function days(n: number) {
  return n === 1 ? "يوم واحد" : n === 2 ? "يومان" : n <= 10 ? `${n} أيام` : `${n} يوماً`;
}

export function welcomeEmail(to: string, p: { name: string | null; restaurantName: string; menuUrl: string }): EmailMessage {
  return layout(to, `أهلاً بك في منيو — ${p.restaurantName} جاهز`, {
    heading: `أهلاً ${p.name?.trim() || "بك"} 👋`,
    paragraphs: [
      `تم إنشاء مطعم «${p.restaurantName}» وبدأت تجربتك المجانية لمدة شهر كامل بكل الميزات.`,
      "الخطوات التالية: أضف الشعار وصورة الغلاف، ثم أصناف المنيو بصورها، ثم اطبع رمز QR وضعه على الطاولات.",
      `رابط منيو مطعمك للزبائن: ${p.menuUrl}`,
    ],
    button: { label: "افتح لوحة التحكم", url: appUrl("/admin") },
  });
}

export function passwordResetEmail(to: string, p: { url: string; minutes: number }): EmailMessage {
  return layout(to, "استعادة كلمة المرور — منيو", {
    heading: "استعادة كلمة المرور",
    paragraphs: ["وصلنا طلب لتغيير كلمة مرور حسابك في منيو. اضغط الزر لاختيار كلمة مرور جديدة."],
    button: { label: "اختر كلمة مرور جديدة", url: p.url },
    footnote: `الرابط صالح لمدة ${p.minutes} دقيقة ولمرة واحدة. إن لم تطلب ذلك فتجاهل هذه الرسالة — حسابك بأمان.`,
  });
}

export function trialEndingEmail(to: string, p: { restaurantName: string; daysLeft: number }): EmailMessage {
  return layout(to, `تبقّى ${days(p.daysLeft)} على نهاية تجربة ${p.restaurantName}`, {
    heading: `تجربتك المجانية تنتهي بعد ${days(p.daysLeft)}`,
    paragraphs: [
      `نتمنى أن «${p.restaurantName}» استفاد من منيو خلال فترة التجربة.`,
      "حتى يبقى المنيو متاحاً لزبائنك بعد نهاية التجربة، تواصل معنا لتفعيل الاشتراك — الدفع بالتحويل أو نقداً.",
    ],
    button: subscribeButton(p.restaurantName),
  });
}

export function trialEndedEmail(to: string, p: { restaurantName: string }): EmailMessage {
  return layout(to, `انتهت التجربة المجانية لـ ${p.restaurantName}`, {
    heading: "انتهت تجربتك المجانية",
    paragraphs: [
      `المنيو العام لـ «${p.restaurantName}» متوقف الآن عن الزبائن. لوحة التحكم وكل بياناتك محفوظة كما هي.`,
      "فعّل الاشتراك ويعود المنيو للعمل فوراً.",
    ],
    button: subscribeButton(p.restaurantName),
  });
}

export function subscriptionEndingEmail(to: string, p: { restaurantName: string; daysLeft: number }): EmailMessage {
  return layout(to, `اشتراك ${p.restaurantName} ينتهي بعد ${days(p.daysLeft)}`, {
    heading: `اشتراكك ينتهي بعد ${days(p.daysLeft)}`,
    paragraphs: [`جدّد اشتراك «${p.restaurantName}» حتى لا يتوقف المنيو والطلبات عن زبائنك.`],
    button: subscribeButton(p.restaurantName, "جدّد الاشتراك"),
  });
}

export function subscriptionExpiredEmail(to: string, p: { restaurantName: string; graceDays: number }): EmailMessage {
  return layout(to, `انتهى اشتراك ${p.restaurantName}`, {
    heading: "انتهى اشتراكك",
    paragraphs: [
      `انتهى اشتراك «${p.restaurantName}». المنيو ما زال يعمل لمدة ${days(p.graceDays)} كمهلة، ثم يتوقف عن الزبائن.`,
      "جدّد الآن ليستمر كل شيء دون انقطاع.",
    ],
    button: subscribeButton(p.restaurantName, "جدّد الاشتراك"),
  });
}

function subscribeButton(restaurantName: string, label = "فعّل الاشتراك") {
  const wa = supportWhatsAppUrl(`مرحباً، أريد تفعيل اشتراك ${restaurantName}`);
  return { label, url: wa ?? appUrl("/admin") };
}
