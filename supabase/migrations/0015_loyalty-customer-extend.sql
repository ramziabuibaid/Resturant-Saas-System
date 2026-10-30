-- =============================================================================
-- توسيع ولاء العملاء: إجمالي مشتريات، رصيد نقاط، وسجل حركات (للتسويق والبونص لاحقاً)
-- شغّل بعد orders-tables-customers.sql (أو في نفس المشروع بعد إنشاء الجداول الأساسية).
-- =============================================================================

-- أعمدة تسويق وولاء على ملف الزبون (حسب رقم الجوال لكل مطعم)
ALTER TABLE public.restaurant_customer_phones
  ADD COLUMN IF NOT EXISTS total_spent_cents BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.restaurant_customer_phones
  ADD COLUMN IF NOT EXISTS points_balance INT NOT NULL DEFAULT 0;

ALTER TABLE public.restaurant_customer_phones
  ADD COLUMN IF NOT EXISTS lifetime_points_earned INT NOT NULL DEFAULT 0;

ALTER TABLE public.restaurant_customer_phones
  ADD COLUMN IF NOT EXISTS lifetime_points_redeemed INT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.restaurant_customer_phones.total_spent_cents IS 'مجموع قيمة الطلبات المؤكدة (بالسنت) — للاستهداف وشرائح الإنفاق';
COMMENT ON COLUMN public.restaurant_customer_phones.points_balance IS 'رصيد نقاط قابل للاستخدام (بونص/خصومات)';
COMMENT ON COLUMN public.restaurant_customer_phones.lifetime_points_earned IS 'إجمالي النقاط المكتسبة عبر الزمن';
COMMENT ON COLUMN public.restaurant_customer_phones.lifetime_points_redeemed IS 'إجمالي النقاط المستبدَلة';

-- سجل حركات النقاط (تدقيق + حملات مستقبلية + استبدال)
CREATE TABLE IF NOT EXISTS public.loyalty_point_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_normalized TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  delta_points INT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN (
    'earn_order',
    'redeem',
    'bonus_campaign',
    'admin_adjust',
    'expiry'
  )),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_restaurant_phone
  ON public.loyalty_point_ledger(restaurant_id, phone_normalized);

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order
  ON public.loyalty_point_ledger(order_id);

ALTER TABLE public.loyalty_point_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read loyalty_point_ledger" ON public.loyalty_point_ledger;
CREATE POLICY "Owner can read loyalty_point_ledger"
  ON public.loyalty_point_ledger FOR SELECT
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- الإدراج/التعديل عبر Service Role من السيرفر فقط (مثل الطلبات)
