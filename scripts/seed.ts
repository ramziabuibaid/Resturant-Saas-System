/**
 * بذرة قاعدة البيانات: حساب مالك النظام + مطعم تجريبي كامل («demo»).
 * آمن للتشغيل أكثر من مرة: لا يكرر ما هو موجود.
 *
 *   npm run db:seed
 *
 * المتغيرات (اختيارية):
 *   SEED_ADMIN_EMAIL      بريد مالك النظام (افتراضي: admin@resturant.app)
 *   SEED_ADMIN_PASSWORD   إن لم يُعطَ تُولَّد كلمة مرور عشوائية
 *
 * كلمات المرور المولَّدة تُكتب في .seed-credentials.local (مستثنى من git) ولا تُطبع.
 */
import { randomBytes } from "node:crypto";
import { appendFileSync, existsSync } from "node:fs";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../src/db";
import { hashPassword } from "../src/lib/auth/password";

// داخل حاوية الأدوات على السيرفر: secrets/ مربوط بمجلد على السيرفر
const CREDENTIALS_FILE = existsSync("secrets") ? "secrets/seed-credentials.txt" : ".seed-credentials.local";
const generated: string[] = [];

function randomPassword() {
  return randomBytes(12).toString("base64url");
}

async function ensureSuperAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@resturant.app").toLowerCase();
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing) return console.log(`• مالك النظام موجود: ${email}`);

  const password = process.env.SEED_ADMIN_PASSWORD ?? randomPassword();
  if (!process.env.SEED_ADMIN_PASSWORD) generated.push(`super_admin  email=${email}  username=admin  password=${password}`);
  await db.insert(schema.users).values({
    email,
    username: "admin",
    passwordHash: await hashPassword(password),
    role: "super_admin",
    fullName: "مالك النظام",
  });
  console.log(`✓ أُنشئ مالك النظام: ${email}`);
}

const DEMO_MENU: { category: string; items: { name: string; description: string; price: number; image?: string; options?: [string, number][] }[] }[] = [
  {
    category: "المشاوي",
    items: [
      { name: "مشاوي مشكلة", description: "كفتة وشيش طاووق وقطع لحم على الفحم مع خبز وسلطات", price: 7500, image: "/images/demo/mixed-grill.png", options: [["شخص", 7500], ["شخصين", 14000]] },
      { name: "شيش طاووق", description: "صدر دجاج متبّل على الفحم مع ثومية", price: 4500 },
      { name: "كباب لحم", description: "لحم بلدي مفروم مع بهارات البيت", price: 5500 },
    ],
  },
  {
    category: "السندويشات",
    items: [
      { name: "شاورما دجاج", description: "خبز صاج، دجاج مشوي، ثومية ومخلل", price: 2000, image: "/images/demo/chicken-shawarma.png", options: [["عادي", 2000], ["دبل", 3000]] },
      { name: "فلافل", description: "فلافل طازجة مع طحينة وخضار", price: 1000 },
    ],
  },
  {
    category: "المقبلات",
    items: [
      { name: "حمص", description: "حمص بالطحينة وزيت الزيتون والبابريكا", price: 1500 },
      { name: "فتوش", description: "خضار طازجة وخبز محمص ودبس رمان", price: 1800 },
    ],
  },
  {
    category: "الحلويات",
    items: [
      { name: "كنافة نابلسية", description: "بالجبنة والفستق الحلبي والقطر", price: 2500, image: "/images/demo/kunafa.png" },
    ],
  },
  {
    category: "المشروبات",
    items: [
      { name: "عصير برتقال طازج", description: "", price: 1200 },
      { name: "قهوة تركية", description: "", price: 800 },
    ],
  },
];

async function ensureDemoRestaurant() {
  const [existing] = await db.select().from(schema.restaurants).where(eq(schema.restaurants.subdomain, "demo")).limit(1);
  if (existing) return console.log("• المطعم التجريبي موجود: demo");

  const ownerPassword = randomPassword();
  await db.transaction(async (tx) => {
    const [r] = await tx
      .insert(schema.restaurants)
      .values({
        name: "مطعم الديوان",
        subdomain: "demo",
        status: "active",
        currencyCode: "ILS",
        headline: "مشاوي ومأكولات شامية",
        subheadline: "طازج كل يوم — اطلب من طاولتك",
        heroBackgroundUrl: "/images/demo/cover.png",
        publicAddress: "رام الله — شارع الإرسال",
        publicPhone1: "0599000000",
        phoneCountryPrefix: "970",
        loyaltyProgramEnabled: true,
      })
      .returning();

    await tx.insert(schema.users).values({
      username: "demo",
      passwordHash: await hashPassword(ownerPassword),
      role: "owner",
      restaurantId: r.id,
      fullName: "صاحب المطعم التجريبي",
    });

    for (const [ci, group] of DEMO_MENU.entries()) {
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
          price: it.price,
          priceOptions: it.options?.map(([label, price_cents]) => ({ label, price_cents })) ?? null,
          imageUrl: it.image ?? null,
          sortOrder: ii,
        }))
      );
    }

    await tx.insert(schema.restaurantTables).values(
      [1, 2, 3, 4, 5, 6].map((n) => ({ restaurantId: r.id, label: `طاولة ${n}`, sortOrder: n }))
    );
  });

  generated.push(`owner(demo)  url=demo.localhost:3000/login  username=demo  password=${ownerPassword}`);
  console.log("✓ أُنشئ المطعم التجريبي: demo (منيو + 6 طاولات + حساب المالك)");
}

async function main() {
  await ensureSuperAdmin();
  await ensureDemoRestaurant();

  if (generated.length) {
    const stamp = new Date().toISOString();
    appendFileSync(CREDENTIALS_FILE, `# ${stamp}\n${generated.join("\n")}\n\n`, { mode: 0o600 });
    console.log(`\nكلمات المرور الجديدة حُفظت في ${CREDENTIALS_FILE} (لا تُرفع إلى git).`);
  }
  // تحقق: المالك مرتبط بالمطعم
  const [check] = await db
    .select({ n: schema.users.username })
    .from(schema.users)
    .innerJoin(schema.restaurants, eq(schema.restaurants.id, schema.users.restaurantId))
    .where(and(eq(schema.restaurants.subdomain, "demo"), eq(schema.users.role, "owner")));
  if (!check) throw new Error("المطعم التجريبي بلا مالك");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
