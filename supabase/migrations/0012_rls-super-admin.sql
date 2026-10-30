-- =============================================================================
-- RLS: السماح لـ super_admin بإدارة جدول restaurants (إضافة / تعديل / حذف)
-- =============================================================================
-- شغّل هذا السكربت في Supabase: SQL Editor → New query → الصق المحتوى → Run
-- تأكد أن المستخدم له سجل في profiles مع role = 'super_admin'
-- =============================================================================

-- تفعيل RLS على الجدول (إن لم يكن مفعّلاً)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وُجدت (لإمكان إعادة التشغيل دون أخطاء)
DROP POLICY IF EXISTS "Super admin can read all restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admin can insert restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admin can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Super admin can delete restaurants" ON public.restaurants;

-- السماح لـ super_admin بقراءة كل المطاعم
CREATE POLICY "Super admin can read all restaurants"
  ON public.restaurants FOR SELECT
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- السماح لـ super_admin بإضافة مطعم جديد
CREATE POLICY "Super admin can insert restaurants"
  ON public.restaurants FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- السماح لـ super_admin بتعديل المطاعم
CREATE POLICY "Super admin can update restaurants"
  ON public.restaurants FOR UPDATE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );

-- السماح لـ super_admin بحذف المطاعم
CREATE POLICY "Super admin can delete restaurants"
  ON public.restaurants FOR DELETE
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
  );
