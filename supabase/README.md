# قاعدة البيانات (Supabase)

```
supabase/
├── migrations/   ← بنية القاعدة: شغّلها بالترتيب الرقمي
├── seed/         ← بيانات تجريبية (منيو البركة)
├── examples/     ← قوالب يدوية (ربط مستخدم بمطعم، إنشاء Super Admin)
└── docs/         ← شروحات إعداد (Auth، Storage CORS، UUID)
```

## مشروع Supabase جديد

1. شغّل كل ملفات `migrations/` **بالترتيب الرقمي** في SQL Editor (من `0000` إلى الأخير).
   كل الملفات مكتوبة بـ `if not exists` / `drop policy if exists`، فتشغيلها مرة ثانية آمن.
2. (اختياري) شغّل `seed/seed-albaraka-menu.sql` لمنيو تجريبي.
3. أنشئ مالك النظام: `docs/CREATE-SUPER-ADMIN.md` ثم `examples/insert-super-admin-profile.sql`.
4. إعداد المصادقة وروابط إعادة التوجيه: `docs/SETUP-NEW-PROJECT.md` (القسم 2).

## إضافة تعديل جديد على القاعدة

أنشئ ملفاً جديداً برقم تالٍ، مثل `migrations/0034_restaurants-brand-color.sql`، واجعله:
- قابلاً لإعادة التشغيل (`add column if not exists`، `drop policy if exists` قبل `create policy`).
- مستقلاً بغرض واحد.

ثم شغّله على قاعدة الإنتاج من SQL Editor.

## ملاحظات

- `0000_base_tables.sql` أُعيد بناؤه في 2026-10-30 من القاعدة الفعلية، لأن إنشاء
  `restaurants` و `categories` و `menu_items` لم يكن محفوظاً في أي ملف.
- ترتيب `0001`–`0033` حسب تاريخ كتابة الملفات الأصلية، مع تصحيح واحد:
  `0014_orders-tables-customers` قبل `0015_loyalty-customer-extend` لأن الثاني يعدّل جداول الأول.
- فحص الأمان (2026-10-30): الزائر المجهول يقرأ فقط `restaurants` و `categories` و `menu_items`.
  الطلبات، الزبائن، الهواتف، والولاء كلها محجوبة عنه.
