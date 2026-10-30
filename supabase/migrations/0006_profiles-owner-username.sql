-- =============================================================================
-- إضافة اسم المستخدم وبريد الدخول لصاحب المطعم (تسجيل دخول بدون إيميل)
-- =============================================================================
-- يشغّل بعد profiles-table.sql و profiles-super-admin.sql
-- =============================================================================

-- اسم المستخدم (يُدخله صاحب المطعم عند الدخول من الدومين الخاص به)
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists login_email text;

-- تعليق: login_email = البريد المستخدم في auth.users (نخزنه لمعرفة الحساب عند تسجيل الدخول بالاسم)
-- لكل مطعم: مستخدم واحد (owner) يمكن أن يكون له username فريد ضمن المطعم

-- فهرس لتسريع البحث عند الدخول: (restaurant_id, username)
create unique index if not exists profiles_restaurant_username_key
  on public.profiles (restaurant_id, username)
  where username is not null and restaurant_id is not null;

-- سياسة: Super Admin يمكنه تحديث profiles (لوضع username/login_email عند إنشاء المالك)
-- نضيف سياسة للسماح لـ super_admin بتحديث أي profile (أو نستخدم service role من التطبيق لإنشاء المالك فلا نحتاج RLS للتحديث من واجهة super admin)
-- إنشاء المالك يتم من السيرفر بـ service role فلا تحتاج سياسة إضافية هنا.
