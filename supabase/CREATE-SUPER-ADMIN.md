# إنشاء أول حساب Super Admin

حساب **Super Admin** هو مالك النظام: يدخل من الدومين الرئيسي (بدون subdomain) ويدير المطاعم ويُنشئ حسابات لأصحاب المطاعم.

## المتطلبات المسبقة

- تشغيل سكربت `profiles-super-admin.sql` (ليصبح عمود `restaurant_id` قابلًا ليكون `NULL` لحساب الـ super admin).
- وجود مطعم واحد على الأقل في جدول `restaurants` (لاحقاً عند إنشاء حسابات أصحاب المطاعم).

---

## الخطوة 1: إنشاء مستخدم في Supabase Auth

1. افتح لوحة **Supabase** → **Authentication** → **Users**.
2. اضغط **Add user** → **Create new user**.
3. أدخل:
   - **Email:** بريدك (مثلاً `admin@example.com`).
   - **Password:** كلمة مرور قوية.
4. اضغط **Create user**.
5. بعد الإنشاء، انسخ **User UID** (هو UUID مثل `a1b2c3d4-e5f6-7890-abcd-ef1234567890`). ستحتاجه في الخطوة 3.

---

## الخطوة 2: جعل عمود restaurant_id يقبل NULL (إن لم يكن قد شُغّل)

في **SQL Editor** شغّل:

```sql
-- إن لم تكن شغّلته مسبقاً
alter table public.profiles
  alter column restaurant_id drop not null;
```

---

## الخطوة 3: إدراج سجل Super Admin في جدول profiles

في **SQL Editor** شغّل الأمر التالي بعد استبدال `YOUR_USER_UID` بـ UUID المستخدم الذي نسخته من الخطوة 1:

```sql
insert into public.profiles (id, role, restaurant_id, username, login_email)
values ('YOUR_USER_UID', 'super_admin', null, 'admin', 'admin@example.com')
on conflict (id) do update set
  role = 'super_admin',
  restaurant_id = null,
  username = excluded.username,
  login_email = excluded.login_email;
```

مثال (استبدل UUID بالقيمة الحقيقية):

```sql
insert into public.profiles (id, role, restaurant_id, username, login_email)
values ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'super_admin', null, 'admin', 'admin@example.com')
on conflict (id) do update set
  role = 'super_admin',
  restaurant_id = null,
  username = excluded.username,
  login_email = excluded.login_email;
```

---

## الخطوة 4: تسجيل الدخول من التطبيق

1. افتح التطبيق على **الدومين الرئيسي** (بدون subdomain)، مثلاً:
   - `http://localhost:3000`
2. اذهب إلى **تسجيل الدخول** (أو `/login`).
3. يجب أن تظهر واجهة **«لوحة إدارة النظام»** مع حقلي **اسم المستخدم** و**كلمة المرور**.
4. أدخل **اسم المستخدم** الذي وضعته في `profiles.username` (مثلاً `admin`) مع **نفس كلمة المرور** التي أنشأتها في الخطوة 1.
5. بعد الدخول ستُوجّه إلى `/admin` وترى لوحة مالك النظام (إحصائيات، مطاعم، إضافة مطعم، إلخ).

---

## ملخص

| الخطوة | أين | ماذا تفعل |
|--------|-----|-----------|
| 1 | Supabase → Authentication → Users | إنشاء مستخدم (Email + Password) ونسخ User UID |
| 2 | SQL Editor | تشغيل `alter table profiles alter column restaurant_id drop not null` إن لزم |
| 3 | SQL Editor | `insert into profiles (id, role, restaurant_id) values ('UUID', 'super_admin', null) ...` |
| 4 | المتصفح → localhost:3000/login | الدخول بالبريد وكلمة المرور ثم استخدام لوحة /admin |

بعد ذلك يمكنك من لوحة Super Admin إضافة مطاعم وإنشاء حسابات لأصحاب المطاعم (حسب ما يوفره التطبيق في صفحة المطاعم).
