-- =============================================================================
-- أرقام عرض الطلب (لكل مطعم) + رمز تتبّع للزبون + عدّاد Realtime
-- نفّذ في Supabase SQL Editor بعد تطبيق orders-tables-customers.sql
-- =============================================================================

-- عدّاد متسلسل لكل مطعم (آخر رقم صادر)
CREATE TABLE IF NOT EXISTS public.restaurant_order_counters (
  restaurant_id UUID PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  last_issued INT NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION public.next_order_display_number(p_restaurant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n int;
BEGIN
  INSERT INTO public.restaurant_order_counters (restaurant_id, last_issued)
  VALUES (p_restaurant_id, 1)
  ON CONFLICT (restaurant_id)
  DO UPDATE SET last_issued = public.restaurant_order_counters.last_issued + 1
  RETURNING last_issued INTO n;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.next_order_display_number(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_order_display_number(uuid) TO service_role;

-- أعمدة الطلبات
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS display_number INT,
  ADD COLUMN IF NOT EXISTS tracking_token TEXT;

-- تعبئة الصفوف القديمة ثم فرض NOT NULL
UPDATE public.orders o
SET
  display_number = COALESCE(
    o.display_number,
    sub.rn
  ),
  tracking_token = COALESCE(
    o.tracking_token,
    encode(gen_random_bytes(32), 'hex')
  )
FROM (
  SELECT
    id,
    row_number() OVER (PARTITION BY restaurant_id ORDER BY created_at) AS rn
  FROM public.orders
) sub
WHERE o.id = sub.id
  AND (o.display_number IS NULL OR o.tracking_token IS NULL);

UPDATE public.restaurant_order_counters c
SET last_issued = GREATEST(
  c.last_issued,
  COALESCE((SELECT MAX(o.display_number) FROM public.orders o WHERE o.restaurant_id = c.restaurant_id), 0)
)
FROM public.restaurants r
WHERE c.restaurant_id = r.id;

INSERT INTO public.restaurant_order_counters (restaurant_id, last_issued)
SELECT r.id, COALESCE(m.mx, 0)
FROM public.restaurants r
LEFT JOIN (
  SELECT restaurant_id, MAX(display_number) AS mx FROM public.orders GROUP BY restaurant_id
) m ON m.restaurant_id = r.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.restaurant_order_counters c2 WHERE c2.restaurant_id = r.id
);

ALTER TABLE public.orders
  ALTER COLUMN display_number SET NOT NULL,
  ALTER COLUMN tracking_token SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tracking_token ON public.orders(tracking_token);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_display ON public.orders(restaurant_id, display_number DESC);

COMMENT ON COLUMN public.orders.display_number IS 'رقم عرض للزبون والطاقم (متسلسل لكل مطعم)';
COMMENT ON COLUMN public.orders.tracking_token IS 'رمز سري لصفحة تتبّع الطلب العامة';

-- تمكين Realtime على جدول الطلبات (لوحة التحكم). إن ظهر خطأ «already member» فالميزة مفعّلة.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
