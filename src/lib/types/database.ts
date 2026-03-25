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

/** طاولة في المطعم — الرمز العام يُستخدم في رابط الـ QR */
export type RestaurantTable = {
  id: string;
  restaurant_id: string;
  label: string;
  public_token: string;
  sort_order: number | null;
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
  fulfillment: OrderFulfillment;
  delivery_address: string | null;
  customer_phone: string;
  status: OrderStatus;
  /** رقم عرض للزبون والطاقم (متسلسل لكل مطعم) */
  display_number: number;
  /** رمز سري لصفحة التتبع العامة */
  tracking_token: string;
  created_at: string;
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
  items: GuestOrderItem[];
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
