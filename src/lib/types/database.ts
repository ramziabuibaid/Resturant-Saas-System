export type Restaurant = {
  id: string;
  name: string;
  subdomain: string;
  slug?: string;
  logo_url?: string | null;
  /** نص رئيسي يظهر في هيرو صفحة المنيو العامة */
  headline?: string | null;
  /** وصف/جملة تعريفية قصيرة للمطعم */
  subheadline?: string | null;
  /** صورة خلفية عريضة لقسم الهيرو (اختيارية) */
  hero_background_url?: string | null;
  /** ملاحظة بسيطة / حقوق أو روابط تظهر في فوتر صفحة المنيو */
  footer_note?: string | null;
  /** عنوان المطعم في فوتر المنيو والتتبع */
  public_address?: string | null;
  /** رابط Google Maps (أو خرائط) — الضغط على العنوان في الفوتر يفتح الموقع على الخريطة */
  public_maps_url?: string | null;
  /** حتى 3 أرقام — يُعرض ما تم إدخاله فقط */
  public_phone_1?: string | null;
  public_phone_2?: string | null;
  public_phone_3?: string | null;
  /** روابط وسائل التواصل — تُعرض الأيقونة في الفوتر فقط عند التعبئة */
  social_facebook_url?: string | null;
  social_instagram_url?: string | null;
  social_tiktok_url?: string | null;
  /** رمز العملة لعرض الأسعار في المنيو (ISO 4217، مثل SAR، ILS، JOD) */
  currency_code?: string | null;
  /** تفعيل عرض عملة ثانية في المنيو */
  secondary_currency_enabled?: boolean | null;
  /** رمز العملة الثانية (ISO 4217) */
  secondary_currency_code?: string | null;
  /** وحدات العملة الثانية لكل 1 وحدة من العملة الأساسية (مثال: 1 USD = 3.7 ILS) */
  secondary_currency_exchange_rate?: number | null;
  /** عند التفعيل: تأثير لون وتوهج ووميض لاسم المطعم في المنيو العام */
  menu_title_animation_enabled?: boolean | null;
  /** بانر ترويجي (صورة أو فيديو) في أعلى صفحة المنيو */
  menu_banner_url?: string | null;
  menu_banner_kind?: "image" | "video" | null;
  /** نص اختياري تحت البانر */
  menu_banner_caption?: string | null;
  /** تفعيل اكتساب النقاط من الطلبات */
  loyalty_program_enabled?: boolean | null;
  /** إنفاق بالسنت لكسب نقطة واحدة (مثال 100 = 1.00 عملة) */
  loyalty_spend_cents_per_point?: number | null;
  /** قيمة نقطة واحدة عند الخصم بالسنت */
  loyalty_point_value_cents?: number | null;
  /**
   * مقدمة الدولة للجوال (أرقام فقط بدون +)، مثل 966 أو 963.
   * تُستخدم لبناء رقم دولي كامل للاتصال وواتساب من رقم الزبون المخزَّن.
   */
  phone_country_prefix?: string | null;
  /** عند التفعيل: إدارة أسماء الويترز وربطهم بالطاولات وفلترة الطلبات */
  waiters_system_enabled?: boolean | null;
  status?: "active" | "suspended" | "trial" | null;
  created_at?: string;
  updated_at?: string;
};

export type Category = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
};

/** خيار سعر حسب الحجم (نفر، نصف كيلو، كيلو، صغير، وسط، كبير، الحبة...) */
export type PriceOption = {
  label: string;
  price_cents: number;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id?: string | null;
  name: string;
  description: string | null;
  price: number;
  /** السعر بالعملة الثانية (بالسنت) عند تفعيلها */
  secondary_price?: number | null;
  /** عند وجوده يُعرض بدل السعر الواحد (أحجام متعددة) */
  price_options?: PriceOption[] | null;
  /** خيارات أسعار بالعملة الثانية لنفس الأحجام */
  secondary_price_options?: PriceOption[] | null;
  /** نص السعرات الحرارية */
  calories?: string | null;
  /** true = وجبة رئيسية، false = مقبلات/إضافة */
  is_meal?: boolean | null;
  image_url: string | null;
  is_available?: boolean;
  category?: string | null; // denormalized or legacy text category
  created_at?: string;
  updated_at?: string;
};

/** Menu item with category relation (from join) */
export type MenuItemWithCategory = MenuItem & {
  categories?: Category | null;
};

export type UserRole = "super_admin" | "owner";

export type Profile = {
  id: string; // same as auth.users.id
  restaurant_id: string | null; // null for super_admin
  role: UserRole | string | null;
  username?: string | null; // لصاحب المطعم: اسم الدخول (بدون إيميل)
  login_email?: string | null; // البريد المخزن في auth.users لاستخدامه عند تسجيل الدخول
  created_at?: string;
  updated_at?: string;
};

/** موظف خدمة طاولات (ويتر) — الاسم فقط دون حساب دخول */
export type RestaurantWaiter = {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number | null;
  created_at?: string;
};

/** طاولة في المطعم — الرمز العام يُستخدم في رابط الـ QR */
export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  label: string;
  public_token: string;
  sort_order: number | null;
  /** مسند من إعدادات الويترز — من يخدم هذه الطاولة */
  waiter_id?: string | null;
  created_at?: string;
};

export type OrderFulfillment = "dine_in" | "pickup" | "delivery";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled";

export type GuestOrder = {
  id: string;
  restaurant_id: string;
  table_id: string | null;
  /** لقطة من ويتر الطاولة عند إنشاء الطلب (اختياري) */
  waiter_id?: string | null;
  fulfillment: OrderFulfillment;
  delivery_address: string | null;
  customer_phone: string;
  status: OrderStatus;
  /** رقم عرض للزبون والطاقم (متسلسل لكل مطعم) */
  display_number: number;
  /** رمز سري لصفحة التتبع العامة */
  tracking_token: string;
  created_at: string;
  /** نقاط مُستبدَلة نقدياً ضمن هذا الطلب */
  loyalty_points_used: number;
  /** قيمة خصم النقاط بالسنت */
  loyalty_discount_cents: number;
  /** نقاط مكتسبة من هذا الطلب (سجل earn_order) — لا علاقة لها باستبدال النقاط */
  loyalty_points_earned_on_order: number;
  /** تم احتساب الإنفاق والولاء عند أول اكتمال (يتطلب عموداً في قاعدة البيانات) */
  completion_accounting_done?: boolean;
  /** ملاحظات داخلية للطاقم — لا تُعرض في تتبّع الزبون */
  staff_notes?: string | null;
  /** خصم يدوي من المالك بالسنت */
  owner_discount_cents?: number | null;
};

export type GuestOrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price_cents: number;
  price_option_label: string | null;
  line_total_cents: number;
  /** مكوّنات يطلب الزبون عدم إضافتها */
  excluded_ingredients?: string[] | null;
  menu_item_name?: string;
};

export type GuestOrderWithDetails = GuestOrder & {
  table_label: string | null;
  /** مسند الطاولة وقت الطلب — للفلترة حسب الويتر */
  table_waiter_id?: string | null;
  /** اسم الويتر المسند للطاولة (إن وُجد) */
  waiter_name?: string | null;
  items: GuestOrderItem[];
  /** رصيد نقاط الزبون حالياً (لوحة الطلبات) */
  customer_loyalty_points_balance: number;
  /** يمكن للمالك تطبيق خصم بالنقاط من لوحة الطلبات */
  owner_can_apply_loyalty_redeem: boolean;
  /** أقصى نقاط مسموحة لهذا الطلب (حسب المبلغ والرصيد) */
  owner_redeem_max_points: number;
  /** قيمة أقصى خصم بالسنت عند أقصى استبدال */
  owner_redeem_max_discount_cents: number;
};

/** ملف زبون لكل مطعم حسب رقم الجوال — مشتريات، نقاط، ولاء */
export type RestaurantCustomerPhone = {
  id: string;
  restaurant_id: string;
  phone_normalized: string;
  first_seen_at?: string;
  last_order_at?: string;
  order_count: number;
  total_spent_cents: number;
  points_balance: number;
  lifetime_points_earned: number;
  lifetime_points_redeemed: number;
};

export type LoyaltyPointReason =
  | "earn_order"
  | "redeem"
  | "bonus_campaign"
  | "admin_adjust"
  | "expiry";

/** سجل حركة نقاط (اكتساب / استبدال / حملة) */
export type LoyaltyPointLedgerEntry = {
  id: string;
  restaurant_id: string;
  phone_normalized: string;
  order_id: string | null;
  delta_points: number;
  reason: LoyaltyPointReason;
  note: string | null;
  created_at: string;
};

export type CustomerProfile = {
  id: string;
  restaurant_id: string;
  phone_normalized: string;
  name: string | null;
  email: string | null;
  preferred_channel: "sms" | "whatsapp" | "email";
  marketing_opt_in: boolean;
  created_at: string;
  updated_at: string;
};

export type LoyaltyAccount = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  points_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  updated_at: string;
};

export type LoyaltyTransactionType =
  | "earn"
  | "redeem_cash"
  | "redeem_reward"
  | "adjustment"
  | "expiry"
  | "bonus";

export type LoyaltyTransaction = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  order_id: string | null;
  tx_type: LoyaltyTransactionType;
  points_delta: number;
  money_value_cents: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type LoyaltyReward = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  points_cost: number;
  active: boolean;
  optional_stock: number | null;
  valid_from: string | null;
  valid_to: string | null;
  created_at: string;
  updated_at: string;
};

export type LoyaltyRewardRedemption = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  reward_id: string;
  order_id: string | null;
  loyalty_transaction_id: string;
  points_spent: number;
  created_at: string;
};

export type OutboundNotificationChannel = "sms" | "whatsapp" | "email";
export type OutboundNotificationStatus = "queued" | "processing" | "sent" | "failed";

export type OutboundNotification = {
  id: string;
  restaurant_id: string;
  customer_id: string;
  channel: OutboundNotificationChannel;
  template_key: string;
  payload: Record<string, unknown>;
  status: OutboundNotificationStatus;
  provider_message_id: string | null;
  error: string | null;
  scheduled_at: string;
  sent_at: string | null;
  created_at: string;
};
