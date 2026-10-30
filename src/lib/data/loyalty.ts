import { createHash } from "node:crypto";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/* بوابة الزبون العامة /loyalty/[token] — للخادم فقط. الرمز السري هو الصلاحية. */

export type LoyaltyPortal = {
  customer: { name: string | null; phone: string; points_balance: number } | null;
  restaurant: { name: string; subdomain: string } | null;
  transactions: { id: string; tx_type: string; points_delta: number; money_value_cents: number; created_at: string }[];
  rewards: { id: string; title: string; points_cost: number; description: string | null }[];
  error: string | null;
};

export async function getLoyaltyPortalByToken(token: string): Promise<LoyaltyPortal> {
  const empty = { customer: null, restaurant: null, transactions: [], rewards: [] };
  const raw = token?.trim();
  if (!raw || !/^[0-9a-f]{48}$/.test(raw)) return { ...empty, error: "الرابط غير صالح" };

  const tokenHash = createHash("sha256").update(raw).digest("hex");
  const [link] = await db
    .select()
    .from(schema.customerPublicLinks)
    .where(eq(schema.customerPublicLinks.tokenHash, tokenHash))
    .limit(1);
  if (!link) return { ...empty, error: "الرابط غير موجود" };
  if (link.isRevoked) return { ...empty, error: "تم إلغاء هذا الرابط" };
  if (link.expiresAt.getTime() < Date.now()) return { ...empty, error: "انتهت صلاحية الرابط" };

  await db
    .update(schema.customerPublicLinks)
    .set({ lastAccessAt: new Date() })
    .where(eq(schema.customerPublicLinks.id, link.id));

  const [[customer], [restaurant], transactions, rewards] = await Promise.all([
    db
      .select()
      .from(schema.customers)
      .where(and(eq(schema.customers.id, link.customerId), eq(schema.customers.restaurantId, link.restaurantId))),
    db
      .select({ name: schema.restaurants.name, subdomain: schema.restaurants.subdomain })
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, link.restaurantId)),
    db
      .select()
      .from(schema.loyaltyTransactions)
      .where(eq(schema.loyaltyTransactions.customerId, link.customerId))
      .orderBy(desc(schema.loyaltyTransactions.createdAt))
      .limit(40),
    db
      .select()
      .from(schema.loyaltyRewards)
      .where(and(eq(schema.loyaltyRewards.restaurantId, link.restaurantId), eq(schema.loyaltyRewards.active, true)))
      .orderBy(asc(schema.loyaltyRewards.pointsCost)),
  ]);

  return {
    customer: customer
      ? { name: customer.name, phone: customer.phoneNormalized, points_balance: customer.pointsBalance }
      : null,
    restaurant: restaurant ?? null,
    transactions: transactions.map((t) => ({
      id: t.id,
      tx_type: t.txType,
      points_delta: t.pointsDelta,
      money_value_cents: t.moneyValueCents,
      created_at: t.createdAt.toISOString(),
    })),
    // المكافآت النافدة أو خارج فترة الصلاحية لا تُعرض للزبون
    rewards: rewards
      .filter(
        (r) =>
          (r.stock === null || r.stock > 0) &&
          (!r.validFrom || r.validFrom.getTime() <= Date.now()) &&
          (!r.validTo || r.validTo.getTime() >= Date.now())
      )
      .map((r) => ({ id: r.id, title: r.title, points_cost: r.pointsCost, description: r.description })),
    error: null,
  };
}
