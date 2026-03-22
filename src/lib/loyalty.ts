/**
 * احتساب النقاط من إعدادات المطعم:
 * - `spendCentsPerPoint`: كل كم سنتاً يُمنح الزبون نقطة واحدة (مثال 100 = 1.00 من العملة).
 * - النقاط = floor(إجمالي الطلب بالسنت / spendCentsPerPoint)
 *
 * قيمة النقطة عند الاستبدال: `pointValueCents` (بالسنت لكل نقطة).
 * مثال: إنفاق 1000 سنت مع spend=100 → 10 نقاط؛ إذا pointValue=10 سنت → يمكن لاحقاً خصم 10×10=100 سنت.
 */

export type LoyaltyComputeSettings = {
  loyaltyProgramEnabled: boolean;
  /** الحد الأدنى 1 */
  spendCentsPerPoint: number;
};

export function pointsEarnedForOrder(
  orderTotalCents: number,
  settings: LoyaltyComputeSettings
): number {
  if (!settings.loyaltyProgramEnabled || orderTotalCents <= 0) return 0;
  const step = Math.max(1, Math.floor(settings.spendCentsPerPoint));
  return Math.floor(orderTotalCents / step);
}

/** قيمة رصيد النقاط بالعملة (سنت) = points × قيمة النقطة */
export function redemptionValueCents(
  pointsBalance: number,
  pointValueCents: number
): number {
  if (pointsBalance <= 0 || pointValueCents <= 0) return 0;
  return pointsBalance * pointValueCents;
}
