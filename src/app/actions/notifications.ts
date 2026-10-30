"use server";

import { and, asc, desc, eq, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { getProfileOrRedirect } from "@/lib/auth/current-user";
import { renderPointsBalanceSmsTemplate } from "@/lib/notifications";

export async function listRecentOutboundNotifications(limit = 40): Promise<{
  rows: {
    id: string;
    channel: string;
    template_key: string;
    status: string;
    created_at: string;
    sent_at: string | null;
    error: string | null;
  }[];
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const rows = await db
    .select()
    .from(schema.outboundNotifications)
    .where(eq(schema.outboundNotifications.restaurantId, restaurant_id!))
    .orderBy(desc(schema.outboundNotifications.createdAt))
    .limit(Math.max(1, Math.min(Math.floor(Number(limit) || 40), 100)));
  return {
    rows: rows.map((n) => ({
      id: n.id,
      channel: n.channel,
      template_key: n.templateKey,
      status: n.status,
      created_at: n.createdAt.toISOString(),
      sent_at: n.sentAt?.toISOString() ?? null,
      error: n.error,
    })),
    error: null,
  };
}

/**
 * معالجة طابور الإشعارات لمطعم المستخدم.
 * ⚠️ لا يوجد مزود SMS/واتساب بعد: الرسالة تُجهَّز ثم تُعلَّم «sent» (محاكاة).
 * عند ربط مزود حقيقي: أرسل هنا وخزّن provider_message_id.
 */
export async function processQueuedNotifications(batchSize = 25): Promise<{
  processed: number;
  sent: number;
  failed: number;
  error: string | null;
}> {
  const { restaurant_id } = await getProfileOrRedirect();
  const queued = await db
    .select()
    .from(schema.outboundNotifications)
    .where(
      and(
        eq(schema.outboundNotifications.restaurantId, restaurant_id!),
        eq(schema.outboundNotifications.status, "queued"),
        lte(schema.outboundNotifications.scheduledAt, new Date())
      )
    )
    .orderBy(asc(schema.outboundNotifications.scheduledAt))
    .limit(Math.max(1, Math.min(Math.floor(Number(batchSize) || 25), 100)));

  let sent = 0;
  let failed = 0;
  for (const row of queued) {
    try {
      if (row.templateKey === "loyalty.points.balance.updated") {
        const p = row.payload;
        renderPointsBalanceSmsTemplate({
          customerName: typeof p.customer_name === "string" ? p.customer_name : null,
          pointsBalance: Number(p.points_balance ?? 0),
          publicLink: typeof p.public_link === "string" ? p.public_link : null,
        });
      }
      await db
        .update(schema.outboundNotifications)
        .set({ status: "sent", sentAt: new Date(), error: null, providerMessageId: `mock-${row.id.slice(0, 8)}` })
        .where(eq(schema.outboundNotifications.id, row.id));
      sent += 1;
    } catch (e) {
      await db
        .update(schema.outboundNotifications)
        .set({ status: "failed", error: e instanceof Error ? e.message : "send failed" })
        .where(eq(schema.outboundNotifications.id, row.id));
      failed += 1;
    }
  }
  return { processed: queued.length, sent, failed, error: null };
}
