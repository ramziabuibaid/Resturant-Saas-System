import { createAdminClient } from "@/lib/supabase/admin";

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
    const admin = createAdminClient();
    await admin.from("outbound_notifications").insert({
      restaurant_id: input.restaurantId,
      customer_id: input.customerId,
      channel: input.channel ?? "sms",
      template_key: "loyalty.points.balance.updated",
      payload: {
        customer_name: input.customerName ?? "",
        points_balance: input.pointsBalance,
        public_link: input.publicLink,
      },
      status: "queued",
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
