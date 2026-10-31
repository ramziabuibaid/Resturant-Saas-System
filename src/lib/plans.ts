/*
 * خطط الاشتراك — مصدر واحد لصفحة الأسعار ولوحة مالك النظام وتقييد الميزات.
 * الأسعار بالدولار (بالسنت) لكل شهر.
 */

export type PlanId = "basic" | "pro" | "chain";

export type PlanFeatures = {
  /** الطلب من صفحة المنيو + رموز QR للطاولات */
  ordering: boolean;
  /** كسب نقاط الولاء والمكافآت */
  loyalty: boolean;
};

export type Plan = {
  id: PlanId;
  name: string;
  desc: string;
  monthlyCents: number;
  /** السعر الشهري عند الدفع السنوي */
  yearlyMonthlyCents: number;
  features: PlanFeatures;
  /** قائمة الميزات المعروضة في صفحة الأسعار */
  highlights: string[];
};

const BASE = ["صفحة المنيو الرقمية", "لوحة تحكم المطعم", "رمز QR للمطعم"];
const PRO = ["رمز QR لكل طاولة", "الطلب من الصفحة", "نقاط ولاء ومكافآت", "دومين خاص بالمطعم", "طباعة فاتورة حرارية"];

export const PLANS: Record<PlanId, Plan> = {
  basic: {
    id: "basic",
    name: "الأساسية",
    desc: "للمطاعم الصغيرة والكافيهات",
    monthlyCents: 800,
    yearlyMonthlyCents: 500,
    features: { ordering: false, loyalty: false },
    highlights: BASE,
  },
  pro: {
    id: "pro",
    name: "الاحترافية",
    desc: "الطلب من الطاولة والولاء",
    monthlyCents: 1500,
    yearlyMonthlyCents: 1000,
    features: { ordering: true, loyalty: true },
    highlights: [...BASE, ...PRO],
  },
  chain: {
    id: "chain",
    name: "السلاسل",
    desc: "للمطاعم متعددة الفروع",
    monthlyCents: 3000,
    yearlyMonthlyCents: 2000,
    features: { ordering: true, loyalty: true },
    highlights: [...BASE, ...PRO, "إدارة عدة فروع", "إعدادات متقدمة"],
  },
};

export const PLAN_LIST = [PLANS.basic, PLANS.pro, PLANS.chain];

/** مدة التجربة المجانية للمطاعم الجديدة */
export const TRIAL_DAYS = 30;
/** أيام سماح بعد انتهاء الاشتراك المدفوع قبل إيقاف المنيو */
export const GRACE_DAYS = 7;

export function planOf(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "pro"];
}

/** السعر المقترح لدفعة: سنوي (12 شهراً) بسعر الخصم، وغير ذلك بالسعر الشهري */
export function suggestedAmountCents(plan: PlanId, months: number): number {
  const p = PLANS[plan];
  return (months >= 12 ? p.yearlyMonthlyCents : p.monthlyCents) * months;
}
