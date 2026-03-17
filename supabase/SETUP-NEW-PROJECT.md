# إعداد مشروع Supabase جديد

بعد إنشاء مشروع Supabase جديد وإنشاء الجداول الأساسية (`restaurants`, `profiles`, `categories`, `menu_items`)، نفّذ التالي بالترتيب.

## 1. تشغيل سكربتات SQL في Supabase → SQL Editor

شغّل الملفات التالية **بنفس الترتيب** (إذا كان الجدول أو العمود موجوداً مسبقاً يمكن تخطيه):

| الترتيب | الملف | الغرض |
|--------|--------|--------|
| 1 | `profiles-table.sql` | جدول/أعمدة الـ profiles إن لزم |
| 2 | `restaurants-status-column.sql` | عمود status لجدول restaurants |
| 3 | `restaurants-public-content-columns.sql` | أعمدة الهيرو والفوتر (headline, subheadline, hero_background_url, footer_note) |
| 3b | `restaurants-currency.sql` | عملة عرض الأسعار في المنيو (currency_code) |
| 4 | `rls-public-menu.sql` | سياسات القراءة العامة للمنيو |
| 5 | `rls-restaurant-owner-update.sql` | صلاحيات تحديث المطعم لصاحب المطعم |
| 6 | `rls-admin-menu-items.sql` | صلاحيات إدارة الأصناف/القوائم |
| 7 | `rls-super-admin.sql` | صلاحيات Super Admin |
| 8 | `storage-menu-images.sql` | دلو التخزين لصور الشعارات والمنيو |

ثم إن احتجت مستخدماً تجريبياً:
- `profiles-super-admin.sql` — لإنشاء Super Admin
- `profiles-owner-username.sql` — لتفعيل تسجيل الدخول باسم المستخدم لصاحب المطعم
- `profiles-insert-example.sql` — مثال لإدراج profile

## 2. إعداد المصادقة (Authentication)

### تعطيل تأكيد البريد (للتسجيل بدون إيميل)

لتسجيل الزائر الجديد بـ **اسم مستخدم + كلمة مرور** فقط (بدون إيميل حقيقي أو تفعيل):

- في Supabase: **Authentication → Providers → Email**
- عطّل **Confirm email** (أو اتركه معطّلاً) حتى يُنشأ الحساب فوراً ويُوجّه لإنشاء المطعم.

### URL Configuration

في لوحة Supabase: **Authentication → URL Configuration**

- **Site URL:** مثلاً `http://localhost:3000` (أو رابط الإنتاج لاحقاً)
- **Redirect URLs:** أضف على الأقل:
  - `http://localhost:3000/**`
  - إذا استخدمت subdomain: `http://*.localhost:3000/**` (إن كان مدعوماً)
  - رابط الإنتاج عند النشر، مثلاً `https://yourdomain.com/**`

## 3. التأكد من ملف البيئة المحلي

في جذر المشروع يجب أن يكون لديك `.env.local` ويحتوي على:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=مفتاح_anon_من_API
SUPABASE_SERVICE_ROLE_KEY=مفتاح_service_role_من_API
```

- **لا ترفع `.env.local` إلى Git** (موجود في `.gitignore`).
- مفتاح `service_role` سري جداً؛ لا تشاركه ولا تضعه في واجهة المستخدم.

## 4. بيانات أولية

- أنشئ مطعماً واحداً على الأقل في جدول `restaurants` (مع `subdomain` و`name`).
- إن استخدمت تسجيل الدخول بصاحب مطعم، أنشئ مستخدماً في **Authentication → Users** واربطه بـ `profiles` مع `restaurant_id` و`role`.

بعد ذلك شغّل التطبيق (`npm run dev`) وجرّب الدخول وعرض المنيو.
