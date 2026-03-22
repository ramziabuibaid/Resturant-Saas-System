-- =============================================================================
-- طاولات، طلبات من المنيو، وأرقام العملاء (ولاء / تسويق)
-- شغّل في Supabase SQL Editor بعد الجداول الأساسية.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- الطاولات: رمز عام (public_token) يُضمّن في رابط الـ QR لتحديد الطاولة
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  public_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant_id ON public.restaurant_tables(restaurant_id);

-- -----------------------------------------------------------------------------
-- الطلبات
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  fulfillment TEXT NOT NULL CHECK (fulfillment IN ('dine_in', 'pickup', 'delivery')),
  delivery_address TEXT,
  customer_phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'preparing', 'ready', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id_created ON public.orders(restaurant_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- بنود الطلب
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_cents INT NOT NULL,
  price_option_label TEXT,
  line_total_cents INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- -----------------------------------------------------------------------------
-- تجميع أرقام الجوال لكل مطعم (ولاء / تسويق)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_customer_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  phone_normalized TEXT NOT NULL,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_order_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_count INT NOT NULL DEFAULT 1,
  total_spent_cents BIGINT NOT NULL DEFAULT 0,
  points_balance INT NOT NULL DEFAULT 0,
  lifetime_points_earned INT NOT NULL DEFAULT 0,
  lifetime_points_redeemed INT NOT NULL DEFAULT 0,
  UNIQUE (restaurant_id, phone_normalized)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_customer_phones_restaurant ON public.restaurant_customer_phones(restaurant_id);

-- سجل نقاط (اكتساب / استبدال / حملات) — للتدقيق والتسويق المستقبلي
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

CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_restaurant_phone ON public.loyalty_point_ledger(restaurant_id, phone_normalized);
CREATE INDEX IF NOT EXISTS idx_loyalty_ledger_order ON public.loyalty_point_ledger(order_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_customer_phones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_point_ledger ENABLE ROW LEVEL SECURITY;

-- الطاولات: لا سياسة SELECT للزوار — الجلب من السيرفر فقط (Service Role) لمنع كشف طاولات مطاعم أخرى
DROP POLICY IF EXISTS "Public can read restaurant_tables" ON public.restaurant_tables;

DROP POLICY IF EXISTS "Owner can manage restaurant_tables" ON public.restaurant_tables;
CREATE POLICY "Owner can manage restaurant_tables"
  ON public.restaurant_tables FOR ALL
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- الطلبات: الإدراج عبر Service Role فقط من السيرفر (لا سياسة insert للـ anon)
DROP POLICY IF EXISTS "Owner can read orders" ON public.orders;
CREATE POLICY "Owner can read orders"
  ON public.orders FOR SELECT
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner can update orders" ON public.orders;
CREATE POLICY "Owner can update orders"
  ON public.orders FOR UPDATE
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner can read order_items" ON public.order_items;
CREATE POLICY "Owner can read order_items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
    )
  );

-- أرقام العملاء: للمالك فقط
DROP POLICY IF EXISTS "Owner can read restaurant_customer_phones" ON public.restaurant_customer_phones;
CREATE POLICY "Owner can read restaurant_customer_phones"
  ON public.restaurant_customer_phones FOR SELECT
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

DROP POLICY IF EXISTS "Owner can read loyalty_point_ledger" ON public.loyalty_point_ledger;
CREATE POLICY "Owner can read loyalty_point_ledger"
  ON public.loyalty_point_ledger FOR SELECT
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );
