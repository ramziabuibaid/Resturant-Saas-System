// فحص سريع لقاعدة البيانات: ينشئ مطعماً ومستخدماً وصنفاً وطلباً داخل معاملة ثم يتراجع عنها.
// الاستعمال: npm run db:smoke
process.env.DATABASE_URL ??= "postgres://postgres@localhost:5442/restaurant_saas";
const { db, schema } = await import("../src/db/index");
const { eq, sql } = await import("drizzle-orm");
class Rollback extends Error {}
try {
  await db.transaction(async (tx) => {
    const [r] = await tx.insert(schema.restaurants).values({ name: "تجربة", subdomain: "test" }).returning();
    await tx.insert(schema.users).values({ username: "owner", passwordHash: "x", restaurantId: r.id });
    // نفس اسم المستخدم في نفس المطعم يجب أن يُرفض
    let dupRejected = false;
    try { await tx.transaction(async (t2) => { await t2.insert(schema.users).values({ username: "owner", passwordHash: "x", restaurantId: r.id }); }); } catch { dupRejected = true; }
    const [cat] = await tx.insert(schema.categories).values({ restaurantId: r.id, name: "مشاوي" }).returning();
    const [item] = await tx.insert(schema.menuItems).values({ restaurantId: r.id, categoryId: cat.id, name: "كباب", price: 4500, priceOptions: [{ label: "كبير", price_cents: 6000 }] }).returning();
    const [{ n }] = await tx.update(schema.restaurants).set({ lastOrderNumber: sql`${schema.restaurants.lastOrderNumber} + 1` }).where(eq(schema.restaurants.id, r.id)).returning({ n: schema.restaurants.lastOrderNumber });
    const [o] = await tx.insert(schema.orders).values({ restaurantId: r.id, displayNumber: n, trackingToken: "tok", fulfillment: "dine_in", customerPhone: "0599000000" }).returning();
    await tx.insert(schema.orderItems).values({ orderId: o.id, menuItemId: item.id, itemName: item.name, quantity: 2, unitPriceCents: 4500, lineTotalCents: 9000 });
    const loaded = await tx.query.menuItems.findFirst({ where: eq(schema.menuItems.id, item.id) });
    console.log("order #", n, "| jsonb ok:", loaded?.priceOptions?.[0]?.price_cents === 6000, "| duplicate username rejected:", dupRejected);
    throw new Rollback();
  });
} catch (e) { if (!(e instanceof Rollback)) throw e; }
const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(schema.restaurants);
console.log("restaurants after rollback:", count);
process.exit(0);
