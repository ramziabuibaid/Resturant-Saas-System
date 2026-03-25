-- رابط موقع المطعم على الخريطة (Google Maps وغيره)
-- ترقية من العمود القديم public_website_url إن وُجد
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'public_website_url'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'public_maps_url'
  ) THEN
    ALTER TABLE public.restaurants RENAME COLUMN public_website_url TO public_maps_url;
  END IF;
END $$;

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS public_maps_url TEXT;

COMMENT ON COLUMN public.restaurants.public_maps_url IS 'رابط Google Maps لموقع المطعم؛ الضغط على العنوان في الفوتر يفتح الخريطة';
