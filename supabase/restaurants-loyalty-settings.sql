-- =============================================================================
-- إعدادات برنامج النقاط لكل مطعم (قابلة للتعديل من لوحة التحكم)
-- شغّل في Supabase بعد جداول الطلبات والعملاء.
-- =============================================================================

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS loyalty_program_enabled BOOLEAN NOT NULL DEFAULT false;

-- عدد السنتات (أصغر وحدة) التي يجب إنفاقها لكسب نقطة واحدة (مثال: 100 = 1.00 من العملة)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS loyalty_spend_cents_per_point INT NOT NULL DEFAULT 100;

-- قيمة النقطة الواحدة عند الخصم/الاستبدال بالسنت (مثال: 10 = 0.10 من العملة)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS loyalty_point_value_cents INT NOT NULL DEFAULT 10;

COMMENT ON COLUMN public.restaurants.loyalty_program_enabled IS 'تفعيل اكتساب النقاط من الطلبات';
COMMENT ON COLUMN public.restaurants.loyalty_spend_cents_per_point IS 'إنفاق بالسنت لكسب نقطة واحدة';
COMMENT ON COLUMN public.restaurants.loyalty_point_value_cents IS 'قيمة مستردة لكل نقطة بالسنت عند الخصم';
