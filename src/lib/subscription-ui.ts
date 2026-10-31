import type { SubscriptionState } from "@/lib/subscription";

export const SUB_STATE_UI: Record<SubscriptionState, { label: string; cls: string }> = {
  trial: { label: "تجريبي", cls: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" },
  active: { label: "نشط", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" },
  grace: { label: "مهلة سداد", cls: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300" },
  expired: { label: "منتهي", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  suspended: { label: "موقوف", cls: "bg-stone-200 text-stone-700 dark:bg-stone-500/20 dark:text-stone-300" },
};

export function formatDateAr(iso: string | Date | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar", { day: "numeric", month: "long", year: "numeric" });
}

/** وصف قصير مثل «تنتهي التجربة بعد 5 أيام» */
export function subscriptionSummary(state: SubscriptionState, daysLeft: number | null, endsAt: string | Date | null) {
  const days = (n: number) => (n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n <= 10 ? `${n} أيام` : `${n} يوماً`);
  switch (state) {
    case "trial":
      return daysLeft == null ? "فترة تجربة" : daysLeft <= 0 ? "تنتهي التجربة اليوم" : `تنتهي التجربة بعد ${days(daysLeft)}`;
    case "active":
      return endsAt ? `مدفوع حتى ${formatDateAr(endsAt)}` : "اشتراك بلا انتهاء";
    case "grace":
      return `انتهى الاشتراك منذ ${days(Math.abs(daysLeft ?? 0) || 1)} — مهلة قبل الإيقاف`;
    case "expired":
      return endsAt ? `انتهى في ${formatDateAr(endsAt)}` : "منتهي";
    case "suspended":
      return "موقوف يدوياً";
  }
}
