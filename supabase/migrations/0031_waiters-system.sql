-- =============================================================================
-- نظام الويترز: تفعيل من إعدادات المطعم، أسماء الويترز، وربط كل طاولة بويتر
-- شغّل في Supabase SQL Editor بعد الجداول الأساسية والطاولات.
--
-- إن ظهر: Could not find the 'waiter_id' column of 'orders' in the schema cache
-- 1) نفّذ هذا الملف كاملاً في SQL Editor (أو ملف orders-waiter-id-column.sql إن بقي العمود فقط).
-- 2) أعد تحميل كاش الـ API تلقائياً عبر NOTIFY في آخر الملف؛ أو من لوحة Supabase:
--    Database → (أحياناً) إعادة تشغيل PostgREST، أو شغّل يدوياً: NOTIFY pgrst, 'reload schema';
-- =============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS waiters_system_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.restaurant_waiters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurant_waiters_restaurant_id
  ON public.restaurant_waiters(restaurant_id);

ALTER TABLE public.restaurant_tables
  ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.restaurant_waiters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurant_tables_waiter_id ON public.restaurant_tables(waiter_id);

-- لقطة بالويتر المسند للطاولة وقت إنشاء الطلب (لا تتغير عند إعادة تعيين الطاولة لاحقاً)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.restaurant_waiters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON public.orders(waiter_id);

ALTER TABLE public.restaurant_waiters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can manage restaurant_waiters" ON public.restaurant_waiters;
CREATE POLICY "Owner can manage restaurant_waiters"
  ON public.restaurant_waiters FOR ALL
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

-- يحدّث PostgREST حتى يتعرّف على الأعمدة الجديدة فوراً (يقلّل أخطاء schema cache)
NOTIFY pgrst, 'reload schema';
