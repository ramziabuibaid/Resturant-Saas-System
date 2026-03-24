-- مكونات يطلب الزبون عدم إضافتها مع الصنف (بدون حار، بدون بصل، ...)
-- شغّل في Supabase SQL Editor بعد إنشاء جدول order_items.

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS excluded_ingredients JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.order_items.excluded_ingredients IS
  'مصفوفة نصوص: مكوّنات يطلب الزبون عدم وضعها في الطبق';
