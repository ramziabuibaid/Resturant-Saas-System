# منيو — منصة SaaS لمنيو المطاعم

منصة متعددة المطاعم (multi-tenant): كل مطعم له منيو عام على نطاقه، طلب من الطاولة عبر QR،
ولوحة تحكم خاصة. مالك المنصة يدير كل المطاعم من لوحة Super Admin.

**الحزمة:** Next.js 16 (App Router) · React 19 · Tailwind 4 · shadcn · Supabase (Postgres, Auth, Storage) · Vercel

خارطة التطوير: [docs/ROADMAP.md](docs/ROADMAP.md)

## التشغيل محلياً

```bash
npm install
cp .env.example .env.local   # ثم ضع مفاتيح Supabase
npm run dev
```

| الرابط | ماذا يفتح |
|---|---|
| `http://localhost:3000` | الصفحة الرئيسية للمنصة |
| `http://localhost:3000/admin` | لوحة Super Admin (أو لوحة مطعمك إن دخلت بحساب صاحب مطعم) |
| `http://albaraka.localhost:3000` | منيو مطعم «albaraka» |
| `http://albaraka.localhost:3000/admin` | لوحة تحكم هذا المطعم |

المتصفحات الحديثة تحل `*.localhost` تلقائياً، لا حاجة لتعديل ملف hosts.

## متغيرات البيئة

| المتغير | الغرض |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | الاتصال بـ Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | للخادم فقط: إنشاء مطاعم ومالكين، الطلبات العامة، الولاء |
| `NEXT_PUBLIC_ROOT_DOMAIN` | الدومين الرئيسي في الإنتاج (مثل `menu.app`)؛ المطاعم تصبح `alking.menu.app` |

## كيف يُحدَّد المطعم

[`src/proxy.ts`](src/proxy.ts) يقرأ الـ Host عبر [`src/lib/tenant-host.ts`](src/lib/tenant-host.ts):

- الدومين الرئيسي و `*.vercel.app` → المنصة.
- نطاق فرعي (`alking.menu.app`) أو دومين خاص مسجّل في `restaurants.custom_domain` → مطعم.
- على نطاق المطعم: `/admin`، `/login`، `/auth`، `/loyalty` تعمل كما هي؛ أي مسار آخر يعرض المنيو.

صلاحيات `/admin` كلها في [`src/lib/admin-context.ts`](src/lib/admin-context.ts).

## قاعدة البيانات

انظر [supabase/README.md](supabase/README.md) — ملفات `migrations/` تُشغّل بالترتيب الرقمي.

## قواعد أمان مهمة

- كل دالة في ملف `"use server"` هي endpoint عام. أي action تستخدم `createAdminClient()`
  يجب أن تتحقق من صلاحية المستدعي في أول سطر (`isSuperAdminRequest()` أو `getProfileOrRedirect()`).
- الدوال الداخلية التي تستخدم service role ولا يجب استدعاؤها من المتصفح تُوضع في `src/lib/`، لا في `src/app/actions/`.
