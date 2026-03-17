-- =============================================================================
-- RLS: السماح لصاحب المطعم (owner) بتحديث مطعمه فقط (مثل logo_url)
-- =============================================================================
-- شغّل بعد rls-super-admin.sql و rls-public-menu.sql
-- =============================================================================

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can update own restaurant" ON public.restaurants;
CREATE POLICY "Owner can update own restaurant"
  ON public.restaurants FOR UPDATE
  USING (
    id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    id = (SELECT restaurant_id FROM public.profiles WHERE id = auth.uid())
  );
