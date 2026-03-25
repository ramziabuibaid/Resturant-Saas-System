-- عنوان المطعم وهواتف الفوتر العام (منيو + تتبع)
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS public_address TEXT,
  ADD COLUMN IF NOT EXISTS public_phone_1 TEXT,
  ADD COLUMN IF NOT EXISTS public_phone_2 TEXT,
  ADD COLUMN IF NOT EXISTS public_phone_3 TEXT;

COMMENT ON COLUMN public.restaurants.public_address IS 'عنوان المطعم لعرضه في فوتر المنيو والتتبع';
COMMENT ON COLUMN public.restaurants.public_phone_1 IS 'هاتف 1 للفوتر (اختياري)';
COMMENT ON COLUMN public.restaurants.public_phone_2 IS 'هاتف 2 للفوتر (اختياري)';
COMMENT ON COLUMN public.restaurants.public_phone_3 IS 'هاتف 3 للفوتر (اختياري)';
