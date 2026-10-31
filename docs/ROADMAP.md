# خارطة الطريق — من مشروع متوقف إلى منتج جاهز للعرض على المطاعم

> تاريخ الفحص: 2026-10-30 · آخر commit سابق: 2026-04-05
> المبدأ: **مرحلة واحدة في كل مرة**، لكل مرحلة معيار "انتهت" واضح، ولا ننتقل قبل المراجعة والنشر على Vercel.

---

## 1. نتيجة الفحص (أين نحن الآن)

### ما هو موجود ويعمل (نقاط قوة حقيقية)
- Next.js 16 + React 19 + Tailwind 4 + Supabase + shadcn — بنية حديثة لا تحتاج إعادة كتابة.
- Multi-tenant عبر الـ subdomain (middleware يحدد المطعم ويعيد التوجيه للمنيو / لوحة التحكم).
- منيو عام مع: تصنيفات، أسعار متعددة الأحجام، عملة ثانوية، بانر ترويجي، Stories للأصناف المميزة، فوتر بروابط التواصل.
- طلب من الطاولة عبر QR، تتبع الطلب برابط، استبعاد مكونات، طباعة فاتورة حرارية.
- لوحة مطعم: طلبات، أصناف، تصنيفات، طاولات + QR، زبائن، ولاء/نقاط، نُدُل، إعدادات.
- Super Admin: إحصائيات ورسوم بيانية، إدارة المطاعم وبيانات دخول المالكين.
- TypeScript يمر بدون أخطاء (`tsc` = 0).

### المشاكل التي تمنع العرض على عميل حقيقي
| # | المشكلة | الخطورة |
|---|---------|---------|
| 1 | `api/check-env` و `api/debug-menu` مكشوفان في الإنتاج (يكشفان أسماء مفاتيح البيئة وبيانات خام) | 🔴 أمني |
| 2 | مسارات مكررة: `/owner` و `/admin` (لوحة المطعم مرتين)، و `/super-admin` و `/super_admin` و `/admin` (لوحة النظام ثلاث مرات) | 🔴 صيانة |
| 3 | 20 خطأ ESLint (أغلبها `setState` داخل `useEffect`) — تسبب إعادة رسم متتالية وبطء | 🟠 |
| 4 | 40 ملف SQL متفرق بدون ترتيب أو نظام migrations — لا يمكن إعادة بناء القاعدة بثقة | 🟠 |
| 5 | الـ middleware يستعلم Supabase في **كل** طلب (بما فيها `*.vercel.app`) بدون cache | 🟠 أداء |
| 6 | الهوية البصرية بنفسجي "SaaS عام" لا يوحي بالمطاعم والطعام؛ الصفحة الرئيسية بسيطة جداً وبلا صور أو دليل اجتماعي | 🟠 تسويق |
| 7 | المنيو الحالي يدعم الوضعين لكن بألوان `stone` ثابتة — لا يأخذ لون/هوية المطعم | 🟡 |
| 8 | لا يوجد نظام اشتراكات فعلي (الخطط معروضة فقط) ولا مطعم تجريبي (Demo) للعرض | 🟡 تجاري |
| 9 | لا صفحات قانونية (الخصوصية/الشروط)، لا OG image، لا favicon للمنصة | 🟡 |
| 10 | ملفات README / SYSTEM_CONTEXT قديمة ولا تطابق الكود الفعلي | 🟡 |

---

## 2. الاتجاه التصميمي الجديد

**الاسم المقترح للمنصة:** يبقى «منيو» (قابل للتغيير لاحقاً بمتغير واحد).

**الهوية:** «دافئ، شهي، واثق» — بدل البنفسجي التقني:
- **لون المنصة الأساسي:** برتقالي جمري `#F2541B` (Ember) مع درجة ذهبية مساعدة `#F5B33E` للتمييز.
- **محايدات دافئة:** فاتح `#FAF8F5` / داكن `#0E0D0C` (أسود دافئ وليس أزرق).
- **الخطوط:** `IBM Plex Sans Arabic` للنص + `Readex Pro` للعناوين الكبيرة، و `JetBrains Mono` للأرقام.
- **المنيو:** كل مطعم يختار **لون هوية خاص** (`brand_color`) ووضعاً افتراضياً (فاتح/داكن/تلقائي) — النظام يولّد بقية الدرجات تلقائياً ويضمن التباين.
- **لوحات التحكم:** نمط Linear/Vercel — محايد هادئ، اللون للحالات والأزرار فقط، كثافة معلومات عالية، Sidebar قابل للطي، `⌘K` للبحث السريع.
- كل الشاشات: Light + Dark + System، RTL كامل، تعمل من عرض 360px.

---

## 3. المراحل

### المرحلة 0 — التنظيف والتثبيت (الأساس) ⏱️ جلسة 1
الهدف: قاعدة نظيفة وآمنة نبني فوقها.
1. حذف/حماية `api/check-env` و `api/debug-menu`.
2. توحيد المسارات: لوحة المطعم = `/admin` على الـ subdomain، لوحة النظام = `/admin` على الدومين الرئيسي؛ تحويل `/owner`, `/super-admin`, `/super_admin` إلى redirects ثم حذف الكود المكرر.
3. إصلاح أخطاء ESLint الـ 20 + التحذيرات.
4. تجميع ملفات SQL في `supabase/migrations/` مرتبة زمنياً + ملف `schema.sql` واحد يعكس الحالة الفعلية (نسحبه من Supabase).
5. مراجعة سياسات RLS لكل جدول (منع أي مطعم من قراءة بيانات غيره).
6. Cache لاستعلام المطعم في الـ middleware + تجاهل نطاقات `*.vercel.app` بشكل صحيح عبر `NEXT_PUBLIC_ROOT_DOMAIN`.
7. `npm run build` ينجح بدون تحذيرات، تحديث README.

**انتهت عندما:** build + lint نظيفان، لا نقاط debug، مسار واحد لكل لوحة.

#### ✅ تم (2026-10-30) — فرع `phase-0-cleanup`
- حذف `api/check-env` و `api/debug-menu`.
- `/admin` واحد لكل الأدوار (`src/lib/admin-context.ts`)، وتحويل دائم من `/owner` و `/super-admin` و `/super_admin`، وصفحة `/forbidden` بدل حلقة التوجيه.
- **ثغرات حرجة أُغلقت في الكود:** دوال تغيير كلمة مرور المالك، حذف المطعم، وقراءة أسماء المستخدمين كانت قابلة للاستدعاء من أي زائر؛ وحُذفت `setProfileRestaurant` التي تسمح لأي مسجّل بربط نفسه بأي مطعم.
- **ثغرات في قاعدة البيانات:** `migrations/0034_security-hardening.sql` (نُفّذ على Supabase؛ لم يعد مستخدماً بعد المرحلة M — الصلاحيات الآن في الخادم) — ⚠️ **يجب تشغيله يدوياً في Supabase**.
- صفر أخطاء/تحذيرات ESLint، ثيم عبر next-themes (بلا وميض).
- ترقية Next.js 16.1.6 → 16.4.3 (الإصدار القديم يفشل في البناء بسبب تغيير روابط Google Fonts — كان سيكسر النشر على Vercel).
- `middleware.ts` → `proxy.ts` مع cache 60 ثانية، دعم `NEXT_PUBLIC_ROOT_DOMAIN`، الدومينات الخاصة، ومعاينات Vercel؛ وإصلاح `/loyalty` و `/auth/signout` على نطاق المطعم (كانا يعرضان المنيو).
- تنظيم SQL في `supabase/migrations/0000–0034`.

#### ملاحظات مؤجلة لمراحل لاحقة
- ~~**الولاء:** أي زائر يكتب رقم هاتف شخص آخر يرى رصيده ويستخدمه.~~ ✅ حُلّت في المرحلة 6: صفحة الطلب لا تعرض الرصيد ولا تستبدل النقاط؛ الاستبدال من بطاقة الطلب عند الموظف فقط. (OTP عبر SMS يمكن إضافته لاحقاً عند ربط مزود رسائل.)
- **المنيو (المرحلة 3):** المحتوى يظهر بعد أكثر من 3 ثوانٍ بسبب حركات الدخول والصور.
- لا يوجد حد لعدد الطلبات (rate limit) على `createGuestOrder`.

### المرحلة M — النقل إلى سيرفر محلي (storeserver) والاستغناء عن Supabase
الخطة الكاملة: [MIGRATION-SELF-HOSTED.md](MIGRATION-SELF-HOSTED.md). تُنفّذ قبل المرحلة 1.

### المرحلة 1 — نظام التصميم v2 ⏱️ جلسة 1
1. Tokens جديدة في `globals.css` (فاتح/داكن) + إزالة ازدواج `tailwind.config.js` مع Tailwind 4.
2. توحيد مزودي الثيم (يوجد `ThemeProvider.tsx` و `theme-provider.tsx` و `ThemeToggle` و `theme-toggle`).
3. تحديث مكونات shadcn الأساسية (Button, Card, Input, Dialog, Sheet, Badge, Tabs, Table, Skeleton, EmptyState, StatCard).
4. صفحة داخلية `/design` (للمطور فقط) تعرض كل المكونات في الوضعين.
5. تحديث `DESIGN_SYSTEM.md`.

**انتهت عندما:** كل المكونات تظهر صحيحة في الوضعين ومتباينة (WCAG AA).

### المرحلة 2 — الصفحة الرئيسية (Landing) ⏱️ جلستان
الأقسام:
1. Navbar لاصق + زر الثيم + "جرّب المنيو التجريبي".
2. Hero: عنوان قوي + صورة هاتف يعرض منيو حقيقي + QR على طاولة (صورة Nano Banana #1).
3. شريط ثقة: "مطاعم تستخدم المنصة" / أرقام (يُملأ لاحقاً بشعارات حقيقية).
4. "كيف يعمل" في 3 خطوات (أنشئ ← أضف المنيو ← اطبع QR).
5. الميزات بـ Bento grid: طلب من الطاولة، تتبع الطلب، لوحة طلبات حية، نقاط الولاء، عملتان، طباعة حرارية، فاتح/داكن.
6. معاينة حية: iframe/لقطات للمنيو التجريبي في الوضعين.
7. لوحة التحكم: لقطة شاشة حقيقية للوحة (بعد المرحلة 4 نحدّثها).
8. الأسعار (شهري/سنوي) + مقارنة الخطط.
9. أسئلة شائعة.
10. CTA نهائي + تواصل واتساب.
11. Footer + صفحات `/privacy` و `/terms`.
12. SEO: metadata، OG image (Nano Banana #6)، sitemap، robots، favicon.

**انتهت عندما:** Lighthouse ≥ 90 على الجوال، الصفحة مقنعة بدون شرح شفهي.

### المرحلة 3 — منيو الزبائن (القلب) ⏱️ جلستان–3
1. عمود `brand_color` + `menu_theme_default` في `restaurants` + توليد الألوان تلقائياً.
2. ترويسة جديدة: غلاف (cover) + شعار + حالة مفتوح/مغلق + معلومات سريعة.
3. شريط تصنيفات لاصق مع تمرير تلقائي وتمييز التصنيف الحالي (scroll-spy) + بحث.
4. بطاقات أصناف بنمطين (قائمة / شبكة) + شارات (جديد، الأكثر طلباً، حار، نباتي).
5. صفحة/Sheet تفاصيل الصنف: صورة كبيرة، الأحجام، استبعاد المكونات، ملاحظة، الكمية.
6. سلة عائمة + Checkout مُبسّط (تقسيم `menu-ordering.tsx` 933 سطراً إلى مكونات).
7. صفحة تتبع الطلب بتصميم مراحل حي.
8. Skeletons، صور `next/image` محسّنة، صور بديلة جميلة للأصناف بلا صورة.
9. وضع "عرض فقط" للمطاعم التي لا تريد الطلب الإلكتروني.
10. اختبار على أجهزة حقيقية (iPhone/Android) وسرعة 3G.

**انتهت عندما:** المنيو التجريبي يبدو كتطبيق مطعم فاخر في الوضعين، والطلب من الطاولة يعمل من البداية للنهاية.

### المرحلة 4 — لوحة تحكم المطعم ⏱️ 3 جلسات
1. Shell جديد: Sidebar قابل للطي، Topbar (اسم المطعم، "عرض المنيو"، الثيم، الإشعارات، الحساب)، تنقل سفلي على الجوال.
2. نظرة عامة: مبيعات اليوم، الطلبات النشطة، متوسط الفاتورة، أكثر الأصناف، رسم بياني أسبوعي.
3. الطلبات: لوحة Kanban حية (جديد ← قيد التحضير ← جاهز ← مكتمل) + صوت تنبيه + طباعة.
4. المنيو: إدارة التصنيفات والأصناف في شاشة واحدة، سحب وإفلات للترتيب، تبديل التوفر بنقرة، رفع صور مع قص.
5. الطاولات وQR: طباعة بطاقات QR بتصميم جاهز للطباعة (A6) بشعار المطعم.
6. الزبائن والولاء.
7. الإعدادات: معلومات، الهوية (شعار، غلاف، لون) مع **معاينة حية للمنيو**، ساعات العمل، العملة، التواصل.
8. معالج إعداد أول مرة (Onboarding) بخطوات: الهوية ← أول تصنيف ← أول صنف ← QR.

**انتهت عندما:** صاحب مطعم جديد يجهز منيو كامل ويطبع QR خلال 15 دقيقة بدون مساعدة.

### المرحلة 5 — لوحة Super Admin ⏱️ جلستان
1. Shell بنفس نظام لوحة المطعم مع تمييز لوني بسيط.
2. لوحة مؤشرات: مطاعم نشطة/تجريبية/موقوفة، إيراد شهري متوقع (MRR)، طلبات اليوم عبر المنصة، اشتراكات تنتهي قريباً.
3. المطاعم: بحث، فلترة، إنشاء مطعم + مالك في خطوة واحدة، تعليق/تفعيل، فتح المنيو، الدخول كالمالك (impersonate) بأمان.
4. الاشتراكات: خطة كل مطعم، تاريخ الانتهاء، تسجيل دفعة يدوية، تجديد.
5. سجل نشاط (Audit log) للعمليات الحساسة.

### المرحلة 6 — الجاهزية التجارية ⏱️ جلستان
1. جداول `plans` و `subscriptions` وتقييد الميزات حسب الخطة (مثلاً الطلب الإلكتروني والولاء في الخطط الأعلى).
2. فترة تجريبية تلقائية + تنبيه قبل الانتهاء + إيقاف المنيو بلطف عند الانتهاء.
3. الدفع: يدوي أولاً (تحويل/نقدي يسجله Super Admin) — ثم بوابة دفع مناسبة للمنطقة لاحقاً.
4. مطعم تجريبي كامل (`demo`) بصور وأصناف حقيقية (صور Nano Banana #3).
5. الدومينات الخاصة للمطاعم على Vercel (custom domain) + توثيق الخطوات.
6. رسائل بريد: ترحيب، إعادة تعيين كلمة المرور، انتهاء التجربة.

### المرحلة 7 — الجودة والإطلاق ⏱️ جلسة
1. اختبار يدوي شامل (قائمة تحقق) في الوضعين وعلى الجوال.
2. Sentry أو ما يعادله لمراقبة الأخطاء + Vercel Analytics.
3. نسخ احتياطي لـ Supabase، فحص الفهارس (indexes) والأداء.
4. فيديو/عرض تقديمي قصير لعرضه على أصحاب المطاعم.

---

## 4. برومبتات Nano Banana للصور

> اكتب البرومبت بالإنجليزية للحصول على أفضل نتيجة. صدّر بصيغة PNG/WebP بالأبعاد المذكورة وضعها في `public/images/landing/` (أو `public/images/demo/`).
> **ملاحظة:** لقطات لوحة التحكم والمنيو داخل الصفحة الرئيسية ستكون **لقطات شاشة حقيقية** من التطبيق وليست مولّدة — حتى لا يرى العميل شيئاً غير موجود.

### #1 — صورة Hero (الهاتف + QR على الطاولة) · 1600×1200
```
Photorealistic close-up of a modern restaurant table at golden hour, a hand holding a sleek smartphone in the foreground, the phone screen is blank pure white (to be replaced later), on the wooden table a small matte black acrylic stand with a QR code, a plate of grilled mezze and a glass of fresh lemonade with mint softly blurred in the background, warm ember-orange and amber ambient lighting, shallow depth of field, Middle Eastern contemporary restaurant interior, premium editorial food photography, 4:3, no text, no logos
```

### #2 — خلفية Hero للوضع الداكن · 1920×1080
```
Dark moody abstract background for a restaurant tech website, soft warm ember-orange glow (#F2541B) and subtle golden haze on a near-black warm charcoal (#0E0D0C) backdrop, faint smoke wisps and tiny bokeh particles like embers from a grill, lots of empty negative space in the center, minimal, cinematic, 16:9, no text, no objects
```

### #3 — صور أصناف المطعم التجريبي (سلسلة متناسقة) · 1200×1200
استخدم نفس البادئة مع تغيير اسم الطبق:
```
Top-down professional food photography of [DISH], served on a matte dark stone plate, on a warm neutral linen surface, soft natural window light from the left, subtle steam, fresh herbs garnish, consistent styling for a restaurant menu series, appetizing, high detail, square 1:1, no text, no hands
```
أطباق مقترحة: `mixed grill platter with kofta and shish tawook` · `chicken shawarma wrap cut in half with garlic sauce` · `hummus with olive oil and paprika` · `fattoush salad` · `margherita pizza` · `classic beef burger with fries` · `kunafa with pistachio` · `fresh orange juice in a tall glass` · `Turkish coffee in a copper cup` · `falafel plate with tahini`.

### #4 — غلاف المطعم التجريبي (Cover) · 1600×600
```
Wide cinematic interior shot of a cozy modern Levantine restaurant, warm pendant lights, wooden tables, olive green tiles and brass details, evening atmosphere, softly blurred, plenty of calm space for text overlay on the right side, 8:3 ultra-wide banner, no people facing camera, no text
```

### #5 — قسم "كيف يعمل" (3 رسومات متناسقة) · 800×800 لكل واحدة
```
Minimal 3D isometric illustration of [SCENE], soft clay render style, warm off-white background (#FAF8F5), accent color ember orange (#F2541B) with golden yellow highlights, rounded friendly shapes, soft shadows, consistent series, no text
```
المشاهد: `1) a smartphone showing a restaurant dashboard with a plus button` · `2) a stack of menu cards with food icons being organized` · `3) a QR code stand on a restaurant table with a phone scanning it`.

### #6 — صورة المشاركة OG (واتساب/فيسبوك) · 1200×630
```
Clean promotional banner background, warm charcoal (#0E0D0C) left half fading to an ember-orange gradient glow, on the right a floating modern smartphone at a slight angle with a blank white screen, a small QR code card next to it, soft shadows, premium minimal tech-meets-food aesthetic, empty space on the left for Arabic headline text, 1.91:1, no text
```

### #7 — صور الحالات الفارغة (Empty states) · 600×600
```
Minimal flat illustration of [SUBJECT], single-line style with soft fills, ember orange (#F2541B) accent on neutral warm grey, transparent background, friendly and calm, no text
```
الحالات: `an empty serving plate with a fork and knife` (لا أصناف) · `a chef bell on a counter` (لا طلبات) · `a sleeping receipt printer` (لا طلبات اليوم) · `a group of three simple people silhouettes with a heart` (لا زبائن).

### حالة الصور (2026-10-30)
| الصورة | الملف في المشروع | الحالة |
|---|---|---|
| #1 Hero | `public/images/landing/hero-table-qr.png` | ✅ |
| #2 خلفية داكنة | `public/images/landing/hero-bg-dark.png` | ✅ |
| #3 أطباق | `public/images/demo/mixed-grill.png`, `chicken-shawarma.png`, `kunafa.png` | ⏳ 3 من 10 |
| #4 غلاف | `public/images/demo/cover.png` | ✅ |
| #5 كيف يعمل | `public/images/landing/how-step-3-scan.png` | ⏳ 1 من 3 (ينقص 1 و 2) |
| #6 OG | `public/images/landing/og-base.png` | ✅ |
| #7 حالات فارغة | — | ❌ 0 من 4 |

---

## 5. طريقة العمل في كل مرحلة
1. فرع جديد `phase-N-...`.
2. تنفيذ الخطوات مع commit لكل خطوة منطقية.
3. فحص `lint` + `build` + معاينة في المتصفح (فاتح/داكن، جوال/حاسوب).
4. Preview deployment على Vercel للمراجعة منك.
5. دمج في `main` بعد موافقتك، ثم المرحلة التالية.

## 6. ما أحتاجه منك
- رابط مشروع Supabase/صلاحية لسحب الـ schema الفعلي (أو تشغيل `supabase db dump`).
- الدومين الرئيسي الذي ستستخدمه (`NEXT_PUBLIC_ROOT_DOMAIN`).
- تأكيد الاسم «منيو» واللون البرتقالي الجمري، أو بديلك.
- الأسعار الفعلية للخطط والعملة (دولار / شيكل).
