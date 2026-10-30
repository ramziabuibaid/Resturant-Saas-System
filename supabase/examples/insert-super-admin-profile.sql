-- =============================================================================
-- إدراج أو تحديث profile لـ Super Admin
-- =============================================================================
-- 1) أنشئ مستخدماً أولاً من Supabase → Authentication → Users → Add user
-- 2) انسخ User UID (UUID) من صفحة المستخدم
-- 3) استبدل YOUR_USER_UID أدناه بهذا الـ UUID ثم شغّل السكربت
-- =============================================================================

-- تأكد أن restaurant_id يقبل NULL (شغّل profiles-super-admin.sql إن لم يكن قد نُفّذ)
alter table public.profiles
  alter column restaurant_id drop not null;

-- استبدل YOUR_USER_UID بـ UUID المستخدم من Authentication → Users
insert into public.profiles (id, role, restaurant_id)
values ('YOUR_USER_UID', 'super_admin', null)
on conflict (id) do update set
  role = 'super_admin',
  restaurant_id = null;
