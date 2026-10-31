import { GRACE_DAYS, planOf, type PlanFeatures } from "@/lib/plans";

/*
 * حالة اشتراك المطعم — تُحسب عند الطلب من الأعمدة (لا تحتاج مهمة مجدولة):
 * - suspended: أوقفه مالك النظام يدوياً.
 * - trial: حتى trial_ends_at، ثم expired.
 * - active: حتى paid_until (null = بلا انتهاء)، ثم grace لمدة GRACE_DAYS، ثم expired.
 * المنيو والطلبات تعمل في trial / active / grace فقط.
 */

export type SubscriptionState = "trial" | "active" | "grace" | "expired" | "suspended";

export type SubscriptionInfo = {
  state: SubscriptionState;
  /** المنيو العام والطلبات متاحة */
  canServe: boolean;
  /** نهاية الفترة الحالية (التجربة أو الاشتراك)، null إن كانت بلا انتهاء */
  endsAt: Date | null;
  /** أيام متبقية حتى endsAt (سالبة بعد الانتهاء) */
  daysLeft: number | null;
  features: PlanFeatures;
};

type SubscriptionFields = {
  status: string | null | undefined;
  plan?: string | null;
  trialEndsAt?: Date | string | null;
  paidUntil?: Date | string | null;
};

const DAY = 86_400_000;

function toDate(v: Date | string | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getSubscriptionInfo(r: SubscriptionFields, now: Date = new Date()): SubscriptionInfo {
  const plan = planOf(r.plan);
  const daysUntil = (d: Date | null) => (d ? Math.ceil((d.getTime() - now.getTime()) / DAY) : null);

  if (r.status === "suspended") {
    return { state: "suspended", canServe: false, endsAt: null, daysLeft: null, features: plan.features };
  }

  if (r.status === "trial") {
    const end = toDate(r.trialEndsAt);
    const expired = end != null && end.getTime() < now.getTime();
    // أثناء التجربة تُفتح كل الميزات ليجرّبها صاحب المطعم
    return {
      state: expired ? "expired" : "trial",
      canServe: !expired,
      endsAt: end,
      daysLeft: daysUntil(end),
      features: { ordering: true, loyalty: true },
    };
  }

  const end = toDate(r.paidUntil);
  if (!end || end.getTime() >= now.getTime()) {
    return { state: "active", canServe: true, endsAt: end, daysLeft: daysUntil(end), features: plan.features };
  }
  const inGrace = now.getTime() - end.getTime() <= GRACE_DAYS * DAY;
  return {
    state: inGrace ? "grace" : "expired",
    canServe: inGrace,
    endsAt: end,
    daysLeft: daysUntil(end),
    features: plan.features,
  };
}
