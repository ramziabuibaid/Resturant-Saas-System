-- مقدمة دولية لأرقام الزبائن (واتساب / اتصال) — نفّذ في Supabase SQL Editor
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS phone_country_prefix TEXT;

COMMENT ON COLUMN public.restaurants.phone_country_prefix IS
  'أرقام المقدمة الدولية فقط بدون + (مثال: 966، 963، 962). تُدمج تلقائياً مع رقم الزبون في لوحة الطلبات.';
