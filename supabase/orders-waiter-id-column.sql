-- =============================================================================
-- إضافة عمود waiter_id على الطلبات فقط
-- استخدمه إذا كان عندك بالفعل: restaurant_waiters + عمود waiter_id على restaurant_tables
-- وما زال الخطأ: waiter_id غير موجود في orders / schema cache
-- شغّله في Supabase SQL Editor ثم جرّب التطبيق من جديد.
-- =============================================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS waiter_id UUID REFERENCES public.restaurant_waiters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_waiter_id ON public.orders(waiter_id);

NOTIFY pgrst, 'reload schema';
