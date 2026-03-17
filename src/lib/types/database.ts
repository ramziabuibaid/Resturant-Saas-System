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
  /** عند وجوده يُعرض بدل السعر الواحد (أحجام متعددة) */
  price_options?: PriceOption[] | null;
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
