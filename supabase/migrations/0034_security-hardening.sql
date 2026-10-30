-- =============================================================================
-- تقوية الأمان (المرحلة 0 — 2026-10-30)
-- آمن للتشغيل أكثر من مرة. شغّله كاملاً في Supabase → SQL Editor.
--
-- يغلق ثلاث ثغرات موجودة في ملفات السياسات السابقة:
--   1) أي مستخدم مسجّل (التسجيل مفتوح عبر /signup) يستطيع تعديل ملفه في profiles
--      وتغيير role إلى super_admin أو restaurant_id إلى مطعم غيره → سيطرة كاملة.
--   2) سياسات menu_items في 0002 تسمح بالإضافة/التعديل/الحذف لأي أحد (true).
--   3) أي مستخدم مسجّل يستطيع رفع/حذف صور أي مطعم في menu-images.
--
-- كل العمليات المشروعة على هذه الحقول تتم من الخادم بمفتاح service_role
-- (إنشاء المطعم، بيانات دخول المالك، لوحة Super Admin) فلا تتأثر.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- دوال مساعدة
-- ---------------------------------------------------------------------------

-- هل الطلب من الخادم (service_role) أو من SQL Editor مباشرة؟
create or replace function public.is_privileged_request()
returns boolean
language sql
stable
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin');
$$;

create or replace function public.current_user_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id from public.profiles where id = auth.uid();
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- 1) profiles: المستخدم لا يغيّر صلاحياته أو ربطه بمطعم أو بيانات دخوله
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged_request() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.role, 'owner') <> 'owner' or new.restaurant_id is not null then
      raise exception 'profiles: role/restaurant_id can only be set by the server'
        using errcode = '42501';
    end if;
  elsif new.role is distinct from old.role
     or new.restaurant_id is distinct from old.restaurant_id
     or new.username is distinct from old.username
     or new.login_email is distinct from old.login_email then
    raise exception 'profiles: privileged columns can only be changed by the server'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_privileged_columns on public.profiles;
create trigger trg_protect_profile_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- 2) restaurants: صاحب المطعم لا يغيّر النطاق أو الحالة (الاشتراك) بنفسه
-- ---------------------------------------------------------------------------

create or replace function public.protect_restaurant_admin_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged_request() or public.current_user_is_super_admin() then
    return new;
  end if;

  if new.subdomain is distinct from old.subdomain
     or new.custom_domain is distinct from old.custom_domain
     or new.status is distinct from old.status then
    raise exception 'restaurants: subdomain/custom_domain/status can only be changed by the platform'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_restaurant_admin_columns on public.restaurants;
create trigger trg_protect_restaurant_admin_columns
  before update on public.restaurants
  for each row execute function public.protect_restaurant_admin_columns();

-- ---------------------------------------------------------------------------
-- 3) menu_items: الكتابة لصاحب المطعم على أصناف مطعمه فقط
-- ---------------------------------------------------------------------------

drop policy if exists "Allow insert menu_items" on public.menu_items;
drop policy if exists "Allow update menu_items" on public.menu_items;
drop policy if exists "Allow delete menu_items" on public.menu_items;

drop policy if exists "Owner can insert menu_items" on public.menu_items;
create policy "Owner can insert menu_items"
  on public.menu_items for insert
  to authenticated
  with check (restaurant_id = public.current_user_restaurant_id());

drop policy if exists "Owner can update menu_items" on public.menu_items;
create policy "Owner can update menu_items"
  on public.menu_items for update
  to authenticated
  using (restaurant_id = public.current_user_restaurant_id())
  with check (restaurant_id = public.current_user_restaurant_id());

drop policy if exists "Owner can delete menu_items" on public.menu_items;
create policy "Owner can delete menu_items"
  on public.menu_items for delete
  to authenticated
  using (restaurant_id = public.current_user_restaurant_id());

-- ---------------------------------------------------------------------------
-- 4) storage menu-images: كل مطعم يكتب في مجلده فقط ({restaurant_id}/...)
-- ---------------------------------------------------------------------------

drop policy if exists "Allow upload menu-images" on storage.objects;
create policy "Allow upload menu-images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'menu-images'
    and (
      (storage.foldername(name))[1] = public.current_user_restaurant_id()::text
      or public.current_user_is_super_admin()
    )
  );

drop policy if exists "Allow update menu-images" on storage.objects;
create policy "Allow update menu-images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'menu-images'
    and (
      (storage.foldername(name))[1] = public.current_user_restaurant_id()::text
      or public.current_user_is_super_admin()
    )
  );

drop policy if exists "Allow delete menu-images" on storage.objects;
create policy "Allow delete menu-images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'menu-images'
    and (
      (storage.foldername(name))[1] = public.current_user_restaurant_id()::text
      or public.current_user_is_super_admin()
    )
  );

-- =============================================================================
-- تحقق بعد التشغيل: انسخ نتيجة هذا الاستعلام وأرسلها للمراجعة.
-- يجب ألا يبقى أي سياسة INSERT/UPDATE/DELETE فيها "true" على menu_items أو profiles.
-- =============================================================================
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by tablename, cmd, policyname;
