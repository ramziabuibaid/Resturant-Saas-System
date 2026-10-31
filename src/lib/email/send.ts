/*
 * إرسال البريد عبر Resend (واجهة HTTP مباشرة — بلا حزمة إضافية).
 * بدون RESEND_API_KEY: لا يُرسل شيء، تُطبع الرسالة في السجل فقط (مناسب للتطوير).
 */

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

const FROM = () => process.env.EMAIL_FROM?.trim() || "منيو <noreply@resturant.app>";

/** لا يرمي استثناء أبداً — فشل البريد لا يجب أن يُفشل التسجيل أو الدخول */
export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) {
    console.info(`[email:dev] → ${msg.to} | ${msg.subject}\n${msg.text}`);
    return { ok: false, error: "RESEND_API_KEY غير مضبوط" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM(),
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        reply_to: process.env.EMAIL_REPLY_TO?.trim() || undefined,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = (await res.text()).slice(0, 300);
      console.error(`[email] Resend ${res.status}: ${body}`);
      return { ok: false, error: `Resend ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}
