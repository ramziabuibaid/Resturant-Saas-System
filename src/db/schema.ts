/**
 * مخطط قاعدة البيانات (PostgreSQL + Drizzle) — المصدر الوحيد للحقيقة.
 *
 * بعد أي تعديل هنا:  npm run db:generate  ثم  npm run db:migrate
 *
 * لا يوجد RLS: كل الصلاحيات في الخادم. أي استعلام على جدول فيه restaurant_id
 * يجب أن يُقيَّد بمطعم المستخدم الحالي (انظر src/lib/admin-context.ts).
 *
 * الأسعار والمبالغ كلها بالسنت (integer). مثال: 12.50 ← 1250.
 */
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export type PriceOption = { label: string; price_cents: number };
export type SecondaryPriceOption = { label: string; price_cents: number };

// ---------------------------------------------------------------------------
// المطاعم
// ---------------------------------------------------------------------------

export const restaurantStatus = pgEnum("restaurant_status", ["active", "trial", "suspended"]);
export const menuBannerKind = pgEnum("menu_banner_kind", ["image", "video"]);

export const restaurants = pgTable("restaurants", {
  id: id(),
  name: text("name").notNull(),
  /** دائماً بأحرف صغيرة */
  subdomain: text("subdomain").notNull().unique(),
  customDomain: text("custom_domain").unique(),
  status: restaurantStatus("status").notNull().default("trial"),

  // الهوية
  logoUrl: text("logo_url"),
  headline: text("headline"),
  subheadline: text("subheadline"),
  heroBackgroundUrl: text("hero_background_url"),
  footerNote: text("footer_note"),
  menuTitleAnimationEnabled: boolean("menu_title_animation_enabled").notNull().default(false),
  menuBannerUrl: text("menu_banner_url"),
  menuBannerKind: menuBannerKind("menu_banner_kind"),
  menuBannerCaption: text("menu_banner_caption"),

  // العملة
  currencyCode: text("currency_code").notNull().default("ILS"),
  secondaryCurrencyEnabled: boolean("secondary_currency_enabled").notNull().default(false),
  secondaryCurrencyCode: text("secondary_currency_code"),
  secondaryCurrencyExchangeRate: numeric("secondary_currency_exchange_rate", { precision: 14, scale: 6 }),

  // التواصل
  phoneCountryPrefix: text("phone_country_prefix"),
  publicAddress: text("public_address"),
  publicMapsUrl: text("public_maps_url"),
  publicPhone1: text("public_phone_1"),
  publicPhone2: text("public_phone_2"),
  publicPhone3: text("public_phone_3"),
  socialFacebookUrl: text("social_facebook_url"),
  socialInstagramUrl: text("social_instagram_url"),
  socialTiktokUrl: text("social_tiktok_url"),

  // الولاء
  loyaltyProgramEnabled: boolean("loyalty_program_enabled").notNull().default(false),
  /** كم سنتاً يدفع الزبون ليكسب نقطة */
  loyaltySpendCentsPerPoint: integer("loyalty_spend_cents_per_point").notNull().default(100),
  /** قيمة النقطة الواحدة بالسنت عند الاستبدال */
  loyaltyPointValueCents: integer("loyalty_point_value_cents").notNull().default(10),

  // الطلبات
  waitersSystemEnabled: boolean("waiters_system_enabled").notNull().default(false),
  /** آخر رقم طلب صدر — يُزاد ذرّياً بـ UPDATE ... RETURNING */
  lastOrderNumber: integer("last_order_number").notNull().default(0),

  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// ---------------------------------------------------------------------------
// المستخدمون والجلسات (بديل Supabase Auth + profiles)
// ---------------------------------------------------------------------------

export const userRole = pgEnum("user_role", ["super_admin", "owner"]);

export const users = pgTable(
  "users",
  {
    id: id(),
    /** مالك النظام يدخل بالبريد؛ صاحب المطعم قد لا يملك بريداً */
    email: text("email").unique(),
    /** بأحرف صغيرة؛ فريد داخل المطعم (أو بين مالكي النظام عندما restaurant_id = null) */
    username: text("username"),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name"),
    role: userRole("role").notNull().default("owner"),
    restaurantId: uuid("restaurant_id").references(() => restaurants.id, { onDelete: "cascade" }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("users_restaurant_username_key").on(t.restaurantId, t.username).nullsNotDistinct(),
    index("users_restaurant_idx").on(t.restaurantId),
  ]
);

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 للرمز الموجود في الكوكي — الرمز نفسه لا يُخزَّن */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    userAgent: text("user_agent"),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)]
);

// ---------------------------------------------------------------------------
// المنيو
// ---------------------------------------------------------------------------

export const categories = pgTable(
  "categories",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    orderIndex: integer("order_index").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("categories_restaurant_idx").on(t.restaurantId, t.orderIndex)]
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    description: text("description"),
    /** السعر الأساسي بالسنت (يُستخدم عندما لا توجد price_options) */
    price: integer("price").notNull(),
    priceOptions: jsonb("price_options").$type<PriceOption[]>(),
    secondaryPrice: integer("secondary_price"),
    secondaryPriceOptions: jsonb("secondary_price_options").$type<SecondaryPriceOption[]>(),
    imageUrl: text("image_url"),
    calories: text("calories"),
    isMeal: boolean("is_meal").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("menu_items_restaurant_idx").on(t.restaurantId),
    index("menu_items_category_idx").on(t.categoryId, t.sortOrder),
  ]
);

// ---------------------------------------------------------------------------
// الطاولات والنُدُل
// ---------------------------------------------------------------------------

export const restaurantWaiters = pgTable(
  "restaurant_waiters",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("restaurant_waiters_restaurant_idx").on(t.restaurantId)]
);

export const restaurantTables = pgTable(
  "restaurant_tables",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    /** الرمز في رابط QR (?t=...) */
    publicToken: uuid("public_token").notNull().unique().defaultRandom(),
    waiterId: uuid("waiter_id").references(() => restaurantWaiters.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("restaurant_tables_restaurant_idx").on(t.restaurantId)]
);

// ---------------------------------------------------------------------------
// الزبائن والولاء (يدمج customer_profiles + restaurant_customer_phones + loyalty_accounts)
// ---------------------------------------------------------------------------

export const notificationChannel = pgEnum("notification_channel", ["sms", "whatsapp", "email"]);

export const customers = pgTable(
  "customers",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    /** أرقام فقط (8–15 خانة) */
    phoneNormalized: text("phone_normalized").notNull(),
    name: text("name"),
    email: text("email"),
    preferredChannel: notificationChannel("preferred_channel").notNull().default("sms"),
    marketingOptIn: boolean("marketing_opt_in").notNull().default(false),

    // إحصائيات الطلبات
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastOrderAt: timestamp("last_order_at", { withTimezone: true }),
    orderCount: integer("order_count").notNull().default(0),
    totalSpentCents: bigint("total_spent_cents", { mode: "number" }).notNull().default(0),

    // رصيد الولاء
    pointsBalance: integer("points_balance").notNull().default(0),
    lifetimeEarned: integer("lifetime_earned").notNull().default(0),
    lifetimeRedeemed: integer("lifetime_redeemed").notNull().default(0),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("customers_restaurant_phone_key").on(t.restaurantId, t.phoneNormalized),
    index("customers_restaurant_last_order_idx").on(t.restaurantId, t.lastOrderAt),
  ]
);

// ---------------------------------------------------------------------------
// الطلبات
// ---------------------------------------------------------------------------

export const orderStatus = pgEnum("order_status", [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
]);
export const orderFulfillment = pgEnum("order_fulfillment", ["dine_in", "pickup", "delivery"]);

export const orders = pgTable(
  "orders",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    /** رقم يراه الزبون والطاقم، متسلسل لكل مطعم */
    displayNumber: integer("display_number").notNull(),
    /** رمز سري لصفحة التتبع العامة */
    trackingToken: text("tracking_token").notNull().unique(),
    status: orderStatus("status").notNull().default("pending"),
    fulfillment: orderFulfillment("fulfillment").notNull(),
    tableId: uuid("table_id").references(() => restaurantTables.id, { onDelete: "set null" }),
    waiterId: uuid("waiter_id").references(() => restaurantWaiters.id, { onDelete: "set null" }),
    customerId: uuid("customer_id").references(() => customers.id, { onDelete: "set null" }),
    customerPhone: text("customer_phone").notNull(),
    customerEmail: text("customer_email"),
    deliveryAddress: text("delivery_address"),

    loyaltyPointsUsed: integer("loyalty_points_used").notNull().default(0),
    loyaltyDiscountCents: integer("loyalty_discount_cents").notNull().default(0),
    ownerDiscountCents: integer("owner_discount_cents").notNull().default(0),
    staffNotes: text("staff_notes"),
    /** نقاط الإكمال وإحصائيات الزبون أُضيفت مرة واحدة فقط */
    completionAccountingDone: boolean("completion_accounting_done").notNull().default(false),

    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("orders_restaurant_display_key").on(t.restaurantId, t.displayNumber),
    index("orders_restaurant_created_idx").on(t.restaurantId, t.createdAt),
    index("orders_restaurant_status_idx").on(t.restaurantId, t.status),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: id(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** null إن حُذف الصنف من المنيو لاحقاً — الاسم محفوظ في item_name */
    menuItemId: uuid("menu_item_id").references(() => menuItems.id, { onDelete: "set null" }),
    itemName: text("item_name").notNull(),
    priceOptionLabel: text("price_option_label"),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    lineTotalCents: integer("line_total_cents").notNull(),
    excludedIngredients: jsonb("excluded_ingredients").$type<string[]>().notNull().default([]),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)]
);

// ---------------------------------------------------------------------------
// سجل الولاء والمكافآت
// ---------------------------------------------------------------------------

export const loyaltyTxType = pgEnum("loyalty_tx_type", [
  "earn",
  "redeem_cash",
  "redeem_reward",
  "adjustment",
  "expiry",
  "bonus",
]);

export const loyaltyTransactions = pgTable(
  "loyalty_transactions",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    txType: loyaltyTxType("tx_type").notNull(),
    /** موجب للكسب، سالب للاستبدال */
    pointsDelta: integer("points_delta").notNull(),
    moneyValueCents: integer("money_value_cents").notNull().default(0),
    note: text("note"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (t) => [
    index("loyalty_tx_customer_idx").on(t.customerId, t.createdAt),
    index("loyalty_tx_restaurant_idx").on(t.restaurantId, t.createdAt),
    // نقاط الكسب تُمنح مرة واحدة لكل طلب
    uniqueIndex("loyalty_tx_one_earn_per_order")
      .on(t.orderId)
      .where(sql`${t.txType} = 'earn'`),
  ]
);

export const loyaltyRewards = pgTable(
  "loyalty_rewards",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    pointsCost: integer("points_cost").notNull(),
    active: boolean("active").notNull().default(true),
    stock: integer("stock"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("loyalty_rewards_restaurant_idx").on(t.restaurantId, t.active)]
);

export const loyaltyRewardRedemptions = pgTable(
  "loyalty_reward_redemptions",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    rewardId: uuid("reward_id")
      .notNull()
      .references(() => loyaltyRewards.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    loyaltyTransactionId: uuid("loyalty_transaction_id").notNull(),
    pointsSpent: integer("points_spent").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    index("loyalty_redemptions_customer_idx").on(t.customerId, t.createdAt),
    // اسم صريح: الاسم التلقائي أطول من 63 حرفاً (حد Postgres)
    foreignKey({
      name: "loyalty_redemptions_tx_fk",
      columns: [t.loyaltyTransactionId],
      foreignColumns: [loyaltyTransactions.id],
    }).onDelete("cascade"),
  ]
);

/** روابط بوابة الزبون (/loyalty/[token]) */
export const customerPublicLinks = pgTable(
  "customer_public_links",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    lastAccessAt: timestamp("last_access_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("customer_links_customer_idx").on(t.customerId)]
);

// ---------------------------------------------------------------------------
// الإشعارات الصادرة (SMS / واتساب / بريد) — طابور يعالجه عامل لاحقاً
// ---------------------------------------------------------------------------

export const notificationStatus = pgEnum("notification_status", [
  "queued",
  "processing",
  "sent",
  "failed",
]);

export const outboundNotifications = pgTable(
  "outbound_notifications",
  {
    id: id(),
    restaurantId: uuid("restaurant_id")
      .notNull()
      .references(() => restaurants.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    channel: notificationChannel("channel").notNull(),
    templateKey: text("template_key").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    status: notificationStatus("status").notNull().default("queued"),
    providerMessageId: text("provider_message_id"),
    error: text("error"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("notifications_queue_idx").on(t.status, t.scheduledAt),
    index("notifications_restaurant_idx").on(t.restaurantId, t.createdAt),
  ]
);
