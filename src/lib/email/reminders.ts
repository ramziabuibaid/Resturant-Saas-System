import { and, eq, isNotNull, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { GRACE_DAYS } from "@/lib/plans";
import { getSubscriptionInfo } from "@/lib/subscription";
import { emailConfigured, sendEmail, type EmailMessage } from "@/lib/email/send";
import {
  subscriptionEndingEmail,
  subscriptionExpiredEmail,
  trialEndedEmail,
  trialEndingEmail,
} from "@/lib/email/templates";

/*
 * تذكيرات الاشتراك بالبريد — تعمل كل ساعة من instrumentation.ts.
 * كل تذكير يُسجّل في email_log بمفتاح فريد (النوع + المطعم + تاريخ النهاية)،
 * فلا يتكرر حتى لو أُعيد تشغيل الخادم، ويُرسل من جديد إن مُددت الفترة.
 */

const DAY = 86_400_000;
/** لا نرسل «انتهى» لمطعم انتهت فترته منذ زمن طويل (مثلاً بعد أول تشغيل) */
const MAX_LATE_DAYS = 14;

function milestone(daysLeft: number | null, steps: number[]): number | null {
  if (daysLeft == null || daysLeft < 0) return null;
  const sorted = [...steps].sort((a, b) => a - b);
  return sorted.find((s) => daysLeft <= s) ?? null;
}

export async function runSubscriptionReminders(now = new Date()): Promise<{ sent: number; failed: number }> {
  if (!emailConfigured()) return { sent: 0, failed: 0 };

  const rows = await db
    .select({
      id: schema.restaurants.id,
      name: schema.restaurants.name,
      status: schema.restaurants.status,
      plan: schema.restaurants.plan,
      trialEndsAt: schema.restaurants.trialEndsAt,
      paidUntil: schema.restaurants.paidUntil,
      email: schema.users.email,
    })
    .from(schema.restaurants)
    .innerJoin(schema.users, and(eq(schema.users.restaurantId, schema.restaurants.id), eq(schema.users.role, "owner")))
    .where(and(isNotNull(schema.users.email), ne(schema.restaurants.status, "suspended")));

  let sent = 0;
  let failed = 0;

  for (const r of rows) {
    const info = getSubscriptionInfo(r, now);
    const end = info.endsAt;
    if (!end || !r.email) continue;
    const endKey = end.toISOString().slice(0, 10);
    const lateDays = (now.getTime() - end.getTime()) / DAY;

    let kind: string | null = null;
    let message: EmailMessage | null = null;

    if (info.state === "trial") {
      const m = milestone(info.daysLeft, [1, 3, 7]);
      if (m != null) {
        kind = `trial_ending_${m}`;
        message = trialEndingEmail(r.email, { restaurantName: r.name, daysLeft: Math.max(1, info.daysLeft ?? m) });
      }
    } else if (info.state === "expired" && r.status === "trial" && lateDays <= MAX_LATE_DAYS) {
      kind = "trial_ended";
      message = trialEndedEmail(r.email, { restaurantName: r.name });
    } else if (info.state === "active") {
      const m = milestone(info.daysLeft, [3, 7]);
      if (m != null) {
        kind = `subscription_ending_${m}`;
        message = subscriptionEndingEmail(r.email, { restaurantName: r.name, daysLeft: Math.max(1, info.daysLeft ?? m) });
      }
    } else if (info.state === "grace") {
      kind = "subscription_expired";
      message = subscriptionExpiredEmail(r.email, { restaurantName: r.name, graceDays: GRACE_DAYS });
    }

    if (!kind || !message) continue;

    // نحجز السجل أولاً: إن كان موجوداً فقد أُرسل من قبل
    const [log] = await db
      .insert(schema.emailLog)
      .values({ kind, refKey: `${r.id}:${endKey}`, toEmail: r.email, restaurantId: r.id })
      .onConflictDoNothing()
      .returning({ id: schema.emailLog.id });
    if (!log) continue;

    const res = await sendEmail(message);
    if (res.ok) sent++;
    else {
      // نحذف الحجز حتى يُعاد المحاولة في الساعة التالية
      failed++;
      await db.delete(schema.emailLog).where(eq(schema.emailLog.id, log.id));
    }
  }

  if (sent || failed) console.info(`[reminders] sent=${sent} failed=${failed}`);
  return { sent, failed };
}
