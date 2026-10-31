/**
 * مطعم تجريبي سوري للعرض والتصوير («sham»): أسعار بالدولار تظهر بالليرة الجديدة.
 * آمن للتشغيل أكثر من مرة: إن كان المطعم موجوداً يربط فقط صور الأصناف الناقصة.
 *
 *   محلياً:      npx tsx --env-file=.env.local scripts/seed-syria-demo.ts
 *   على السيرفر: docker compose run --rm tools npx tsx scripts/seed-syria-demo.ts
 *
 * كلمة مرور صاحب المطعم تُكتب في ملف بيانات الدخول (كما في seed.ts) ولا تُطبع.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync } from "node:fs";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword } from "../src/lib/auth/password";

const CREDENTIALS_FILE = existsSync("secrets") ? "secrets/seed-credentials.txt" : ".seed-credentials.local";
const SUBDOMAIN = "sham";
/** سعر الدولار بالليرة الجديدة (تقريبي، تشرين الأول 2026) */
const RATE = 122;

type Item = { name: string; description: string; usd: number; image?: string; options?: [string, number][] };

/** صور أصناف المطعم التجريبي (public/images/demo/sham) */
const SHAM_IMG = (file: string) => `/images/demo/sham/${file}.png`;

// الأسعار بالدولار
const MENU: { category: string; items: Item[] }[] = [
  {
    category: "المشاوي",
    items: [
      { name: "مشاوي مشكلة", description: "كباب وشيش طاووق وقطع لحم على الفحم مع خبز وبصل بالسماق", usd: 7.75, image: "/images/demo/mixed-grill.png", options: [["نفر", 7.75], ["كيلو", 26]] },
      { name: "شيش طاووق", description: "صدر دجاج متبّل على الفحم مع ثومية", usd: 5, image: SHAM_IMG("shish-tawook") },
      { name: "كباب حلبي", description: "لحم غنم مفروم مع بهارات حلبية", usd: 5.75, image: SHAM_IMG("kebab-halabi") },
      { name: "كباب بالكرز", description: "على الطريقة الحلبية بصلصة الكرز الحامض", usd: 6.5, image: SHAM_IMG("kebab-karaz") },
    ],
  },
  {
    category: "السندويشات",
    items: [
      { name: "شاورما دجاج", description: "خبز صاج، ثومية، بطاطا ومخلل", usd: 1.5, image: "/images/demo/chicken-shawarma.png", options: [["عادي", 1.5], ["دبل", 2.5]] },
      { name: "شاورما لحمة", description: "طرطور وبقدونس وبندورة", usd: 2.5, image: SHAM_IMG("shawarma-meat") },
      { name: "فلافل", description: "فلافل طازجة مع طرطور وخضار", usd: 0.75, image: SHAM_IMG("falafel") },
    ],
  },
  {
    category: "المقبلات",
    items: [
      { name: "حمص", description: "حمص بالطحينة وزيت الزيتون", usd: 1.75, image: SHAM_IMG("hummus") },
      { name: "متبل", description: "باذنجان مشوي بالطحينة ودبس الرمان", usd: 1.75, image: SHAM_IMG("mutabbal") },
      { name: "محمرة", description: "فليفلة حمراء وجوز ودبس رمان", usd: 2.25, image: SHAM_IMG("muhammara") },
      { name: "فتوش", description: "خضار طازجة وخبز محمص وسماق", usd: 2, image: SHAM_IMG("fattoush") },
      { name: "تبولة", description: "بقدونس وبرغل وليمون", usd: 2, image: SHAM_IMG("tabbouleh") },
    ],
  },
  {
    category: "أطباق شامية",
    items: [
      { name: "فتة حمص", description: "خبز محمص وحمص ولبن وسمنة وصنوبر", usd: 2.5, image: SHAM_IMG("fatteh") },
      { name: "كبة مقلية", description: "4 قطع محشوة لحمة وجوز", usd: 3, image: SHAM_IMG("kibbeh") },
      { name: "يبرق", description: "ورق عنب محشي بالرز والزيت", usd: 3.5, image: SHAM_IMG("yabraq") },
    ],
  },
  {
    category: "الحلويات",
    items: [
      { name: "كنافة", description: "بالجبنة والفستق الحلبي والقطر", usd: 2.5, image: "/images/demo/kunafa.png" },
      { name: "بوظة عربية بالفستق", description: "بوظة مدقوقة بالقشطة والفستق", usd: 2, image: SHAM_IMG("booza") },
      { name: "حلاوة الجبن", description: "حمصية بالقشطة والقطر", usd: 3, image: SHAM_IMG("halawet-jibn") },
    ],
  },
  {
    category: "المشروبات",
    items: [
      { name: "عصير برتقال", description: "طازج", usd: 1.25, image: SHAM_IMG("orange-juice") },
      { name: "ليموناضة بالنعنع", description: "", usd: 1.25, image: SHAM_IMG("lemon-mint") },
      { name: "عرق سوس", description: "", usd: 0.75, image: SHAM_IMG("erq-sous") },
      { name: "قهوة عربية", description: "", usd: 0.75, image: SHAM_IMG("arabic-coffee") },
      { name: "شاي", description: "", usd: 0.5, image: SHAM_IMG("tea") },
    ],
  },
];

const cents = (usd: number) => Math.round(usd * 100);

async function main() {
  const [existing] = await db.select({ id: schema.restaurants.id }).from(schema.restaurants).where(eq(schema.restaurants.subdomain, SUBDOMAIN)).limit(1);
  if (existing) {
    // المطعم موجود: نكمل فقط صور الأصناف التي بلا صورة (بالاسم)
    let linked = 0;
    for (const it of MENU.flatMap((g) => g.items)) {
      if (!it.image) continue;
      const rows = await db
        .update(schema.menuItems)
        .set({ imageUrl: it.image })
        .where(and(eq(schema.menuItems.restaurantId, existing.id), eq(schema.menuItems.name, it.name), isNull(schema.menuItems.imageUrl)))
        .returning({ id: schema.menuItems.id });
      linked += rows.length;
    }
    console.log(`• المطعم موجود: ${SUBDOMAIN} — رُبطت ${linked} صورة`);
    process.exit(0);
  }

  const ownerPassword = randomBytes(12).toString("base64url");
  await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(schema.restaurants)
      .values({
        name: "مطعم بيت الشام",
        subdomain: SUBDOMAIN,
        status: "active",
        plan: "pro",
        currencyCode: "USD",
        secondaryCurrencyEnabled: true,
        secondaryCurrencyCode: "SYP",
        secondaryCurrencyExchangeRate: String(RATE),
        secondaryRoundStep: 5,
        showSecondaryFirst: true,
        pricesUpdatedAt: new Date(),
        headline: "مشاوي وأكلات شامية",
        subheadline: "من مطبخ الشام لطاولتك — اطلب من موبايلك",
        heroBackgroundUrl: "/images/demo/cover.png",
        publicAddress: "دمشق — باب توما",
        phoneCountryPrefix: "963",
        loyaltyProgramEnabled: true,
        loyaltySpendCentsPerPoint: 100,
        loyaltyPointValueCents: 5,
      })
      .returning();

    await tx.insert(schema.exchangeRateHistory).values({ restaurantId: r.id, currencyCode: "SYP", rate: String(RATE) });

    await tx.insert(schema.users).values({
      username: "sham",
      passwordHash: await hashPassword(ownerPassword),
      role: "owner",
      restaurantId: r.id,
      fullName: "أبو سامر",
    });

    for (const [ci, group] of MENU.entries()) {
      const [cat] = await tx
        .insert(schema.categories)
        .values({ restaurantId: r.id, name: group.category, orderIndex: ci })
        .returning();
      await tx.insert(schema.menuItems).values(
        group.items.map((it, ii) => ({
          restaurantId: r.id,
          categoryId: cat.id,
          name: it.name,
          description: it.description || null,
          price: cents(it.options?.[0]?.[1] ?? it.usd),
          priceOptions: it.options?.map(([label, usd]) => ({ label, price_cents: cents(usd) })) ?? null,
          imageUrl: it.image ?? null,
          sortOrder: ii,
        }))
      );
    }

    await tx.insert(schema.restaurantTables).values([
      ...Array.from({ length: 8 }, (_, i) => ({ restaurantId: r.id, label: `طاولة ${i + 1}`, sortOrder: i + 1 })),
      { restaurantId: r.id, label: "تراس 1", sortOrder: 9 },
      { restaurantId: r.id, label: "تراس 2", sortOrder: 10 },
    ]);
  });

  appendFileSync(
    CREDENTIALS_FILE,
    `# ${new Date().toISOString()}\nowner(sham)  url=sham.<domain>/login  username=sham  password=${ownerPassword}\n\n`,
    { mode: 0o600 }
  );
  console.log(`✓ أُنشئ «مطعم بيت الشام» (${SUBDOMAIN}) — كلمة مرور المالك في ${CREDENTIALS_FILE}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
