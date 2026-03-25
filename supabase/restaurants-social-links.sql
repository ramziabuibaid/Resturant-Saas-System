-- روابط وسائل التواصل (فوتر المنيو والتتبع) — تُعرض الأيقونة فقط عند وجود رابط
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS social_facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS social_instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS social_tiktok_url TEXT;

COMMENT ON COLUMN public.restaurants.social_facebook_url IS 'رابط فيسبوك للفوتر العام (اختياري)';
COMMENT ON COLUMN public.restaurants.social_instagram_url IS 'رابط إنستغرام للفوتر العام (اختياري)';
COMMENT ON COLUMN public.restaurants.social_tiktok_url IS 'رابط تيك توك للفوتر العام (اختياري)';
