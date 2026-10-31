/*
 * يعمل مرة واحدة عند تشغيل الخادم. نستخدمه لجدولة تذكيرات الاشتراك بالبريد كل ساعة
 * (التطبيق نسخة واحدة على السيرفر، فلا حاجة لخدمة cron منفصلة).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { runSubscriptionReminders } = await import("@/lib/email/reminders");

  const run = () =>
    runSubscriptionReminders().catch((e) => {
      console.error("[reminders] failed", e);
    });

  // أول تشغيل بعد دقيقتين (حتى تستقر قاعدة البيانات والتطبيق)، ثم كل ساعة
  setTimeout(run, 2 * 60_000);
  setInterval(run, 60 * 60_000);
}
