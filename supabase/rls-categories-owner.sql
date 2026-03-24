-- =============================================================================
-- RLS: السماح لصاحب المطعم بإدارة تصنيفات مطعمه (INSERT / UPDATE / DELETE)
-- =============================================================================
-- المشكلة: rls-public-menu.sql يفعّل RLS على categories مع SELECT للجميع فقط،
-- فيُحجب الإدراج/التعديل/الحذف للمستخدم المسجّل ما لم تُضف سياسات للمالك.
-- شغّل هذا الملف بعد rls-public-menu.sql
-- =============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Owner can update categories" ON public.categories;
DROP POLICY IF EXISTS "Owner can delete categories" ON public.categories;

CREATE POLICY "Owner can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Owner can update categories"
  ON public.categories FOR UPDATE
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  )
  WITH CHECK (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Owner can delete categories"
  ON public.categories FOR DELETE
  USING (
    restaurant_id = (SELECT p.restaurant_id FROM public.profiles p WHERE p.id = auth.uid())
  );
