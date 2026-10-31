import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

/* قراءات التسعير — للخادم فقط (تأخذ معرّف المطعم من المستدعي). */

export async function getExchangeRateHistory(restaurantId: string, limit = 8) {
  const rows = await db
    .select({
      rate: schema.exchangeRateHistory.rate,
      currencyCode: schema.exchangeRateHistory.currencyCode,
      createdAt: schema.exchangeRateHistory.createdAt,
    })
    .from(schema.exchangeRateHistory)
    .where(eq(schema.exchangeRateHistory.restaurantId, restaurantId))
    .orderBy(desc(schema.exchangeRateHistory.createdAt))
    .limit(limit);
  return rows.map((r) => ({ rate: Number(r.rate), currencyCode: r.currencyCode, createdAt: r.createdAt.toISOString() }));
}
