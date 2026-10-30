import { db, schema } from "@/db";

type EnqueuePointsNotificationInput = {
  restaurantId: string;
  customerId: string;
  channel?: "sms" | "whatsapp" | "email";
  customerName?: string | null;
  pointsBalance: number;
  publicLink: string | null;
};

export async function enqueuePointsBalanceNotification(
  input: EnqueuePointsNotificationInput
): Promise<void> {
  try {
    await db.insert(schema.outboundNotifications).values({
      restaurantId: input.restaurantId,
      customerId: input.customerId,
      channel: input.channel ?? "sms",
      templateKey: "loyalty.points.balance.updated",
      payload: {
        customer_name: input.customerName ?? "",
        points_balance: input.pointsBalance,
        public_link: input.publicLink,
      },
    });
  } catch {
    // Best effort queueing; we never block checkout on notification failure.
  }
}

export function renderPointsBalanceSmsTemplate(params: {
  customerName?: string | null;
  pointsBalance: number;
  publicLink: string | null;
}): string {
  const name = params.customerName?.trim() || "عميلنا";
  const linkLine = params.publicLink ? `\nراجع نقاطك وسجلّك: ${params.publicLink}` : "";
  return `مرحبًا ${name}، لديك الآن ${params.pointsBalance} نقطة.${linkLine}`;
}
