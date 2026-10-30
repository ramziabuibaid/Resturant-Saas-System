# منيو — منصة SaaS لمنيو المطاعم

منصة متعددة المطاعم (multi-tenant): كل مطعم له منيو عام على نطاقه، طلب من الطاولة عبر QR،
نقاط ولاء، ولوحة تحكم خاصة. مالك المنصة يدير كل المطاعم من لوحة Super Admin.

**الحزمة:** Next.js 16 (App Router) · React 19 · Tailwind 4 · shadcn · PostgreSQL 17 + Drizzle ORM

- خارطة التطوير: [docs/ROADMAP.md](docs/ROADMAP.md)
- النقل عن Supabase إلى سيرفر محلي: [docs/MIGRATION-SELF-HOSTED.md](docs/MIGRATION-SELF-HOSTED.md)

## التشغيل محلياً

يتطلب Node 22+ و PostgreSQL 17 (`brew install postgresql@17`).

```bash
npm install
cp .env.example .env.local
npm run db:start      # قاعدة محلية في .pgdata/ على المنفذ 5442
npm run db:migrate    # إنشاء الجداول
npm run db:seed       # مالك النظام + مطعم تجريبي «demo» (كلمات المرور في .seed-credentials.local)
npm run dev
```

| الرابط | ماذا يفتح |
|---|---|
| `http://localhost:3000` | الصفحة الرئيسية للمنصة |
| `http://localhost:3000/login` | دخول مالك النظام (البريد من البذرة) |
| `http://demo.localhost:3000` | منيو المطعم التجريبي |
| `http://demo.localhost:3000/admin` | لوحة تحكم المطعم التجريبي (اسم المستخدم `demo`) |

المتصفحات الحديثة تحل `*.localhost` تلقائياً، لا حاجة لتعديل ملف hosts.

## أوامر قاعدة البيانات

| الأمر | الغرض |
|---|---|
| `npm run db:start` / `db:stop` | تشغيل/إيقاف Postgres المحلي |
| `npm run db:psql` | سطر أوامر SQL على القاعدة المحلية |
| `npm run db:generate` | بعد تعديل [`src/db/schema.ts`](src/db/schema.ts): توليد migration جديد في `drizzle/` |
| `npm run db:migrate` | تطبيق الـ migrations |
| `npm run db:seed` | البيانات الأولية (آمن للتكرار) |
| `npm run db:smoke` | فحص سريع للقاعدة داخل معاملة تُلغى |
| `npm run user:password -- <email\|username> [--restaurant <subdomain>]` | تغيير كلمة مرور مستخدم |

## متغيرات البيئة

| المتغير | الغرض |
|---|---|
| `DATABASE_URL` | رابط PostgreSQL |
| `NEXT_PUBLIC_ROOT_DOMAIN` | الدومين الرئيسي في الإنتاج (مثل `resturant.app`)؛ المطاعم تصبح `alking.resturant.app` |
| `UPLOAD_DIR` | مجلد الصور المرفوعة (افتراضي `./uploads`) |

## البنية

| المجلد | المحتوى |
|---|---|
| `src/db/` | المخطط (Drizzle) والاتصال |
| `src/lib/auth/` | كلمات المرور (scrypt) والجلسات (كوكي httpOnly، القاعدة تحفظ hash فقط) |
| `src/lib/data/` | قراءات للخادم فقط (المطاعم، المنيو، الطاولات، بوابة الولاء) |
| `src/lib/loyalty/` | عمليات النقاط (معاملات مع قفل صف الزبون) |
| `src/lib/uploads/` | رفع الصور إلى القرص وتقديمها من `/uploads/...` |
| `src/app/actions/` | Server Actions — **كلها endpoints عامة** |
| `src/proxy.ts` | تحديد المطعم من الدومين وتوجيه الطلب |

### كيف يُحدَّد المطعم

[`src/proxy.ts`](src/proxy.ts) يقرأ الـ Host عبر [`src/lib/tenant-host.ts`](src/lib/tenant-host.ts):

- الدومين الرئيسي و `*.vercel.app` → المنصة.
- نطاق فرعي (`alking.resturant.app`) أو دومين خاص مسجّل في `restaurants.custom_domain` → مطعم.
- على نطاق المطعم: `/admin`، `/login`، `/auth`، `/loyalty`، `/uploads` تعمل كما هي؛ أي مسار آخر يعرض المنيو.

صلاحيات `/admin` كلها في [`src/lib/admin-context.ts`](src/lib/admin-context.ts).

## قواعد أمان مهمة

- **لا يوجد RLS.** كل استعلام على جدول فيه `restaurant_id` يُقيَّد بمطعم المستخدم من الجلسة
  (`getProfileOrRedirect()`)، ولا يُؤخذ معرّف المطعم من المتصفح أبداً.
- كل دالة في ملف `"use server"` هي endpoint عام يستطيع أي زائر استدعاءه. التحقق من الصلاحية في أول سطر
  (`getProfileOrRedirect()` أو `isSuperAdminRequest()`).
- القراءات التي تأخذ معرّفات توضع في `src/lib/data/`، لا في `src/app/actions/`.
- الأسعار تُحسب دائماً من القاعدة عند إنشاء الطلب، لا من المتصفح.
