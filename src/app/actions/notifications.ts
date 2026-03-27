"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfileOrRedirect } from "@/app/actions/auth";
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
  const profile = await getProfileOrRedirect();
  const rid = profile.restaurant_id!;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("outbound_notifications")
    .select("id, channel, template_key, status, created_at, sent_at, error")
    .eq("restaurant_id", rid)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)));
  if (error) return { rows: [], error: error.message };
  return {
    rows: (data ?? []) as {
      id: string;
      channel: string;
      template_key: string;
      status: string;
      created_at: string;
      sent_at: string | null;
      error: string | null;
    }[],
    error: null,
  };
}

/**
 * Worker entrypoint (can be called by cron).
 * Currently mocks provider send and marks queued rows as sent/failed.
 */
export async function processQueuedNotifications(batchSize = 25): Promise<{
  processed: number;
  sent: number;
  failed: number;
  error: string | null;
}> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: queued, error } = await admin
    .from("outbound_notifications")
    .select("id, payload, template_key")
    .eq("status", "queued")
    .lte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true })
    .limit(Math.max(1, Math.min(batchSize, 100)));
  if (error) return { processed: 0, sent: 0, failed: 0, error: error.message };

  let sent = 0;
  let failed = 0;
  for (const row of queued ?? []) {
    const id = (row as { id: string }).id;
    const payload = (row as { payload?: Record<string, unknown> }).payload ?? {};
    try {
      // Placeholder provider rendering. Integrate actual SMS/WhatsApp provider here.
      if ((row as { template_key: string }).template_key === "loyalty.points.balance.updated") {
        renderPointsBalanceSmsTemplate({
          customerName:
            typeof payload.customer_name === "string" ? payload.customer_name : null,
          pointsBalance:
            typeof payload.points_balance === "number"
              ? payload.points_balance
              : Number(payload.points_balance ?? 0),
          publicLink: typeof payload.public_link === "string" ? payload.public_link : null,
        });
      }
      await admin
        .from("outbound_notifications")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          error: null,
          provider_message_id: `mock-${id.slice(0, 8)}`,
        })
        .eq("id", id);
      sent += 1;
    } catch (e) {
      await admin
        .from("outbound_notifications")
        .update({
          status: "failed",
          error: e instanceof Error ? e.message : "send failed",
        })
        .eq("id", id);
      failed += 1;
    }
  }
  return { processed: (queued ?? []).length, sent, failed, error: null };
}
