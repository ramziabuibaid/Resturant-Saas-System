import { createHash, randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { enqueuePointsBalanceNotification } from "@/lib/notifications";

/*
 * عمليات الولاء الأساسية — للخادم فقط.
 * كل تعديل للرصيد يتم داخل معاملة مع قفل صف الزبون (FOR UPDATE) حتى لا تُصرف النقاط مرتين.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

/** أرقام فقط، 8–15 خانة */
export function normalizePhone(raw: string | null | undefined): string | null {
  const digits = (raw ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** يجلب الزبون أو ينشئه (فريد لكل مطعم + رقم) */
export async function ensureCustomer(ex: Executor, restaurantId: string, phone: string) {
  const [row] = await ex
    .insert(schema.customers)
    .values({ restaurantId, phoneNormalized: phone })
    .onConflictDoUpdate({
      target: [schema.customers.restaurantId, schema.customers.phoneNormalized],
      // تحديث لا يغيّر شيئاً — فقط ليعيد الصف الموجود
      set: { phoneNormalized: sql`excluded.phone_normalized` },
    })
    .returning();
  return row;
}

export async function findCustomerByPhone(restaurantId: string, phone: string) {
  const [row] = await db
    .select()
    .from(schema.customers)
    .where(and(eq(schema.customers.restaurantId, restaurantId), eq(schema.customers.phoneNormalized, phone)))
    .limit(1);
  return row ?? null;
}

/**
 * استبدال نقاط بخصم نقدي على طلب. يُستدعى داخل معاملة.
 * يعيد عدد النقاط المستبدلة فعلاً (قد يكون أقل من المطلوب حسب الرصيد).
 */
export async function redeemCashInTx(
  tx: Tx,
  args: { restaurantId: string; customerId: string; orderId: string; pointsRequested: number; pointValueCents: number }
): Promise<{ points: number; discountCents: number; newBalance: number }> {
  const [c] = await tx
    .select({ balance: schema.customers.pointsBalance })
    .from(schema.customers)
    .where(and(eq(schema.customers.id, args.customerId), eq(schema.customers.restaurantId, args.restaurantId)))
    .for("update");
  if (!c) throw new Error("الزبون غير موجود");

  const points = Math.max(0, Math.min(Math.floor(args.pointsRequested), c.balance));
  if (points === 0) return { points: 0, discountCents: 0, newBalance: c.balance };
  const discountCents = points * args.pointValueCents;

  const [updated] = await tx
    .update(schema.customers)
    .set({
      pointsBalance: sql`${schema.customers.pointsBalance} - ${points}`,
      lifetimeRedeemed: sql`${schema.customers.lifetimeRedeemed} + ${points}`,
    })
    .where(eq(schema.customers.id, args.customerId))
    .returning({ balance: schema.customers.pointsBalance });

  await tx.insert(schema.loyaltyTransactions).values({
    restaurantId: args.restaurantId,
    customerId: args.customerId,
    orderId: args.orderId,
    txType: "redeem_cash",
    pointsDelta: -points,
    moneyValueCents: discountCents,
  });

  return { points, discountCents, newBalance: updated.balance };
}

/** رابط بوابة الزبون (/loyalty/[token]) — صالح 180 يوماً، والقاعدة تحفظ hash الرمز فقط */
export async function createCustomerPublicLink(ex: Executor, restaurantId: string, customerId: string) {
  const rawToken = randomBytes(24).toString("hex");
  await ex.insert(schema.customerPublicLinks).values({
    restaurantId,
    customerId,
    tokenHash: createHash("sha256").update(rawToken).digest("hex"),
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  });
  return `/loyalty/${rawToken}`;
}

/**
 * عند أول انتقال للطلب إلى «مكتمل»: يضيف المبلغ المدفوع لإنفاق الزبون ويمنح نقاط الكسب.
 * يحدث مرة واحدة فقط لكل طلب (completion_accounting_done + فهرس فريد على earn).
 */
export async function finalizeCompletedOrder(orderId: string, restaurantId: string): Promise<void> {
  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select()
      .from(schema.orders)
      .where(and(eq(schema.orders.id, orderId), eq(schema.orders.restaurantId, restaurantId)))
      .for("update");
    if (!order || order.status !== "completed" || order.completionAccountingDone) return null;

    const phone = normalizePhone(order.customerPhone);
    if (!phone) {
      await tx.update(schema.orders).set({ completionAccountingDone: true }).where(eq(schema.orders.id, orderId));
      return null;
    }

    const [{ subtotal }] = await tx
      .select({ subtotal: sql<number>`coalesce(sum(${schema.orderItems.lineTotalCents}), 0)::int` })
      .from(schema.orderItems)
      .where(eq(schema.orderItems.orderId, orderId));
    const payable = Math.max(0, subtotal - order.loyaltyDiscountCents - order.ownerDiscountCents);

    const [restaurant] = await tx
      .select({
        enabled: schema.restaurants.loyaltyProgramEnabled,
        spendPer: schema.restaurants.loyaltySpendCentsPerPoint,
      })
      .from(schema.restaurants)
      .where(eq(schema.restaurants.id, restaurantId));
    const points = restaurant?.enabled ? Math.floor(payable / Math.max(1, restaurant.spendPer)) : 0;

    const customer = await ensureCustomer(tx, restaurantId, phone);
    const [updated] = await tx
      .update(schema.customers)
      .set({
        totalSpentCents: sql`${schema.customers.totalSpentCents} + ${payable}`,
        pointsBalance: sql`${schema.customers.pointsBalance} + ${points}`,
        lifetimeEarned: sql`${schema.customers.lifetimeEarned} + ${points}`,
      })
      .where(eq(schema.customers.id, customer.id))
      .returning({ balance: schema.customers.pointsBalance, name: schema.customers.name });

    if (points > 0) {
      await tx.insert(schema.loyaltyTransactions).values({
        restaurantId,
        customerId: customer.id,
        orderId,
        txType: "earn",
        pointsDelta: points,
        metadata: {
          order_subtotal_cents: subtotal,
          loyalty_discount_cents: order.loyaltyDiscountCents,
          owner_discount_cents: order.ownerDiscountCents,
          earn_base_cents: payable,
        },
      });
    }

    await tx
      .update(schema.orders)
      .set({ completionAccountingDone: true, customerId: customer.id })
      .where(eq(schema.orders.id, orderId));

    return points > 0 ? { customerId: customer.id, balance: updated.balance, name: updated.name } : null;
  });

  // الإشعار خارج المعاملة: فشله لا يلغي النقاط
  if (result) {
    const publicLink = await createCustomerPublicLink(db, restaurantId, result.customerId);
    await enqueuePointsBalanceNotification({
      restaurantId,
      customerId: result.customerId,
      customerName: result.name,
      pointsBalance: result.balance,
      publicLink,
    });
  }
}
