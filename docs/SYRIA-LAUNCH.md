# الإطلاق في سوريا — الخصائص وفيديو الموشن جرافيك

> تاريخ الإعداد: 2026-10-31 · السوق المستهدف: مطاعم وكافيهات سوريا
> القاعدة: **الفيديو لا يعرض إلا ما يعمل فعلاً في التطبيق.** لذلك نبني خصائص المرحلة 7 أولاً ثم نصوّر.

---

## 1. حقائق السوق التي نبني عليها

- **الليرة الجديدة:** منذ 1 كانون الثاني 2026 حُذف صفران (100 ليرة قديمة = 1 ليرة جديدة)، وكل الأرصدة البنكية صارت بالجديدة. (تحقق من مهلة سحب القديمة من المصرف المركزي قبل التصوير.)
- **سعر الدولار** حوالي **122 ليرة جديدة** في مطلع تشرين الأول 2026 (أرقام تقريبية من تقارير يومية — ليست مرجعاً رسمياً).
- **التسعير:** كثير من المطاعم تحسب أسعارها بالدولار وتقبض بالليرة، وتغيّر الأسعار كلما تحرّك الصرف — ومعظمها يعيد طباعة المنيو الورقي أو يكتب الأسعار بالقلم.
- **الدفع:** النقد هو الغالب. المحافظ الإلكترونية (شام كاش، سيريتل كاش) موجودة لكن لم أجد ما يؤكد انتشارها في المطاعم — **يُسأل عنها أصحاب المطاعم مباشرة**.
- **الاتصال:** واتساب هو قناة التواصل الأولى؛ الرسائل النصية (SMS) غير مربوطة بالتطبيق.

---

## 2. ما يعمل اليوم (تم التحقق منه في الكود)

| الخاصية | الحالة | ملاحظة |
|---|---|---|
| إنشاء حساب ومطعم ذاتياً (`/signup`) + تجربة 30 يوماً | ✅ | صفحة التسجيل ما زالت **بالتصميم القديم** |
| قائمة «جهّز مطعمك» في النظرة العامة | ✅ | 5 خطوات مع نسبة الإنجاز |
| إضافة صنف: صورة، سعر، أحجام، وصف، توفّر | ✅ | لوحة جانبية واحدة |
| ترتيب التصنيفات والأصناف بالسحب | ✅ | |
| إيقاف صنف «نفد» بلمسة | ✅ | |
| عملتان: أساسية + ثانية مع سعر صرف | ✅ | الليرة السورية والدولار موجودتان |
| تغيير سعر الصرف يُحدّث كل أسعار العملة الثانية | ✅ **جزئياً** | يعمل، لكن الحقل **مدفون في الإعدادات**، و**لا تقريب** (قد يظهر 53,327.25 ل.س) |
| المنيو العام: فاتح/داكن، بحث، تصنيفات، تفاصيل الطبق | ✅ | |
| QR عام + QR لكل طاولة + طباعة الكل | ✅ | |
| الطلب من الطاولة/استلام/توصيل + تتبع الطلب | ✅ | |
| لوحة طلبات حية + جرس + طباعة حرارية | ✅ | |
| العملاء ونقاط الولاء + المكافآت + إرسال الرصيد عبر واتساب | ✅ | الاستبدال عند الموظف فقط |
| الويترز وربطهم بالطاولات | ✅ | |
| خطط واشتراكات وتسجيل دفعات يدوية | ✅ | |
| تحديث جماعي للأسعار (نسبة % أو جدول) | ❌ | |
| شارة «الأسعار محدّثة اليوم» | ❌ | |
| ساعات العمل / مفتوح-مغلق | ❌ | |
| مناطق وأجور توصيل | ❌ | |
| الطلب عبر واتساب | ❌ | |
| منيو بلغتين | ❌ | |

---

## 3. المرحلة 7 — خصائص سوريا

### أ. ضرورية قبل الفيديو (هي قلب الرسالة)

1. **بطاقة «سعر الصرف اليوم»** في أعلى النظرة العامة: حقل واحد + زر «حدّث كل الأسعار» + معاينة قبل/بعد لعدة أصناف + سجل آخر 30 تحديثاً + تاريخ آخر تحديث.
2. **تقريب أسعار الليرة**: أقرب 5 / 10 / 50 / 100 ليرة (يختارها المطعم) حتى تظهر 550 ل.س لا 549.17.
3. **ترتيب عرض العملتين**: الليرة بالخط الكبير والدولار تحتها (أو العكس) — الزبون السوري يدفع بالليرة.
4. **تحديث جماعي للأسعار**: رفع/خفض نسبة % لكل المنيو أو لتصنيف، و**جدول أسعار سريع** يعدّل كل الأصناف في شاشة واحدة.
5. **شارة «الأسعار محدّثة اليوم ✓»** في المنيو العام مع تاريخ آخر تحديث — تبني ثقة الزبون.
6. **صفحة التسجيل بالتصميم الجديد** + معالج إعداد قصير (الاسم ← الشعار ← العملة وسعر الصرف ← أول صنف ← QR).

### ب. مقترحة للسوق السوري (تُبنى بعد الفيديو أو تُذكر كـ«قريباً»)

7. **الطلب عبر واتساب**: زر يرسل الطلب جاهزاً إلى رقم المطعم — بديل لمن لا يريد لوحة الطلبات.
8. **التوصيل بالمناطق**: أحياء المدينة مع أجرة توصيل لكل حي وحد أدنى للطلب.
9. **طرق الدفع المقبولة**: نقدي / شام كاش / سيريتل كاش مع رقم الحساب أو QR — للعرض فقط دون ربط.
10. **ساعات العمل** وحالة «مفتوح الآن / مغلق» تلقائياً.
11. **منيو عربي/إنكليزي** للزوار والمغتربين.
12. **وضع الإنترنت الضعيف**: صور أخف وفتح فوري للمنيو حتى على 3G.
13. **إدخال المنيو من صورة** (ذكاء اصطناعي): يصوّر صاحب المطعم منيوه الورقي فتُنشأ الأصناف تلقائياً — ميزة قوية للتسويق، تحتاج مفتاح API.

---

## 4. فيديو الموشن جرافيك

**الصيغة:** عمودي 9:16 (ريلز/تيك توك/ستوري) بطول 60–70 ثانية + نسخة أفقية 16:9 لاحقاً.
**الصوت:** ElevenLabs بلهجة شامية. **اللقطات:** شاشات حقيقية من التطبيق (لا شاشات مولّدة) + صور Nano Banana للمشاهد الواقعية.
**الأسلوب:** خلفيات داكنة دافئة بلون الهوية (#F2541B)، أرقام تتقلب (flip counters)، انتقالات سريعة على إيقاع الكلام.

### الـ Hook — ثلاثة خيارات (أنصح بالأول)

| # | المشهد (أول 3 ثوانٍ) | التعليق |
|---|---|---|
| **1 ✅** | منيو ورقي، يد تشطب سعراً بالقلم وتكتب فوقه، ثم تشطبه مرة ثانية… | «كل ما يتحرك الدولار… بتقعد تشطب وتكتب عالمنيو؟» |
| 2 | رقم الدولار يقفز على الشاشة 120 → 122 → 125 وأسعار المنيو تحته تحمرّ | «الدولار تحرك؟ منيوك صار غلط.» |
| 3 | إصبع يضغط زراً واحداً، فتنقلب 40 سعراً دفعة واحدة | «لمسة وحدة… وكل أسعار مطعمك صارت عالسعر الجديد.» |

> خيار 1 يبدأ بالألم الذي يعيشه صاحب المطعم يومياً، وخيار 3 هو الحل — لذلك نفتح بـ1 ونقفل الهوك بـ3 خلال 6 ثوانٍ.

### المشاهد والتعليق الصوتي (مسودة — تُثبّت بعد بناء المرحلة 7)

| الوقت | المشهد | التعليق (شامي) |
|---|---|---|
| 0–3 | منيو ورقي، قلم يشطب ويكتب سعراً جديداً، ثم يشطبه | كل ما يتحرك الدولار… بتقعد تشطب وتكتب عالمنيو؟ |
| 3–6 | لقطة شاشة: بطاقة سعر الصرف، إصبع يضغط «حدّث»، كل الأسعار تنقلب | خلص… بلمسة وحدة، كل الأسعار بتتحدث لحالها. |
| 6–11 | شعار «منيو» ينفجر بشرارة برتقالية + اسم الموقع | عرّفك على **منيو** — منيو إلكتروني لمطعمك، بيشتغل من موبايلك. |
| 11–18 | صفحة التسجيل → اسم المطعم → الشعار → رابط المطعم جاهز | بدقيقتين بتفتح حسابك، بتكتب اسم مطعمك، بتحط اللوغو… ومطعمك صار أونلاين. |
| 18–27 | إضافة صنف: صورة، اسم، سعر، أحجام؛ ثم سحب لترتيب الأصناف | بتضيف أكلاتك بصورها وأسعارها، صغير ووسط وكبير، ورتّبها متل ما بدك بالسحب. |
| 27–31 | مفتاح «نفد» على صنف، يظهر في المنيو «نفد حالياً» | خلص الصنف؟ كبسة وحدة وبيبيّن للزبون إنه خلص. |
| 31–42 | **المشهد البطل**: سعر بالدولار ← تحته بالليرة؛ الصرف يتغير 122 → 125؛ كل الأسعار بالليرة تتقلب وتتقرّب لأرقام مرتبة | سعّر بالدولار، والزبون بيشوف السعر بالليرة الجديدة. تغيّر الصرف؟ بتكتب السعر الجديد مرة وحدة باليوم… وكل المنيو بيتحدّث، ومقرّب لأرقام مرتبة. |
| 42–46 | تحديث جماعي: «+10٪ على المشاوي» | وبدك ترفع تصنيف كامل؟ نسبة وحدة وخلصت. |
| 46–53 | QR على طاولة → زبون يفتح المنيو → يطلب → الجرس يرنّ في اللوحة → طباعة الفاتورة | الزبون بيمسح الكود عالطاولة، بيطلب من موبايله، والطلب بيوصلك فوراً مع رقم الطاولة. |
| 53–58 | بطاقة العميل + نقاط + زر واتساب | وكل زبون بيرجع، بيجمع نقاط… وإنت بتبعتله رصيده عالواتساب. |
| 58–62 | لوحة الإحصائيات + تبديل فاتح/داكن | وبتعرف شو عم ينباع أكتر، وقديش دخلك اليوم. |
| 62–70 | شعار + «أول شهر مجاناً» + resturant.app + رقم الواتساب | جرّب منيو أول شهر ببلاش. سجّل هلأ على **resturant.app** |

**ملاحظة للتعليق الصوتي:** اكتب الأرقام كلاماً في ElevenLabs («مية واتنين وعشرين») حتى يُنطق صحيحاً، واطلب في الإعدادات Stability متوسطة وStyle عالية لنبرة حماسية.

### صور Nano Banana المطلوبة

> اكتب البرومبت بالإنجليزية، صدّر PNG، وضعها في `public/images/video/`. الشاشات داخل الهاتف تبقى **بيضاء** لنركّب عليها لقطات حقيقية.

**V1 — المنيو الورقي المشطوب (الهوك) · 1080×1920**
```
Top-down close-up of a worn paper restaurant menu on a dark wooden table in a Damascus restaurant, Arabic dish names written in neat print, several prices crossed out with blue ballpoint pen and rewritten by hand above, then crossed out again, a hand holding a blue pen about to cross out another price, warm tungsten lighting, shallow depth of field, gritty realistic texture, frustrated mood, vertical 9:16, no legible brand names
```

**V2 — يد تحمل هاتفاً بشاشة بيضاء في مطعم شامي · 1080×1920**
```
Vertical 9:16 photo of a restaurant owner's hand holding a modern smartphone with a completely blank pure white screen, standing behind the counter of a traditional Damascene restaurant, background softly blurred with arched stone walls, mosaic tiles, brass lanterns and warm evening light, ember-orange accent glow, photorealistic, premium commercial look, no text
```

**V3 — QR على طاولة بطابع دمشقي · 1080×1920**
```
Vertical 9:16 close-up of a small matte black acrylic QR code stand on a mother-of-pearl inlaid Damascene wooden table, next to a plate of shawarma, a bowl of hummus with olive oil and a glass of mint lemonade, a customer's hand reaching with a smartphone to scan, warm golden light, shallow depth of field, photorealistic food photography, the QR area left plain white, no text
```

**V4 — مطبخ المطعم والطلب يصل · 1080×1920**
```
Vertical 9:16 photo of a busy small Syrian restaurant kitchen at night, a chef in a black apron glancing at a tablet mounted on the wall whose screen is blank white, grill flames and shawarma spit in the background, small thermal receipt printer printing a ticket in the foreground, warm orange light and slight motion blur, cinematic, photorealistic, no text
```

**V5 — خلفية المشهد البطل (الصرف) · 1080×1920**
```
Abstract dark cinematic background for a motion graphics scene about currency exchange, near-black warm charcoal backdrop with soft ember-orange (#F2541B) glow and faint golden light streaks, subtle floating particles like sparks, large empty space in the center for animated numbers, vertical 9:16, no text, no banknotes, no symbols
```

**V6 — صاحب المطعم مرتاح (الخاتمة) · 1080×1920**
```
Vertical 9:16 photo of a smiling Syrian restaurant owner in his 30s with a short beard, wearing a casual dark shirt, leaning on the counter of his cozy modern restaurant in Damascus, holding a smartphone with a blank white screen, customers dining softly blurred behind him, warm evening light with ember-orange accents, authentic and natural, photorealistic, no text
```

---

## 5. الخطوات

1. **أنت:** اختر الخصائص من القسم 3 (أ ثم ب) التي تريدها في هذه المرحلة، وأكّد خيار الـHook.
2. **أنا:** أبني المرحلة 7 (الخصائص المختارة) وأجهّز مطعماً تجريبياً سورياً بأسعار بالدولار والليرة.
3. **أنت:** تولّد الصور V1–V6 + صور الأصناف الناقصة.
4. **أنا:** أثبّت النص النهائي مع التوقيتات، فتسجّله على ElevenLabs.
5. **أنا:** أركّب الفيديو (Remotion) على الصوت كلمةً بكلمة وأصدّر MP4 عمودي وأفقي.

---

## 6. صور أصناف «مطعم بيت الشام» (sham.resturant.app)

> موجودة: مشاوي مشكلة، شاورما دجاج، كنافة، الغلاف. الباقي **24 صنفاً** بلا صورة.
> ولّد كل صورة بالبادئة التالية مع اسم الطبق، مربعة 1200×1200 PNG، وضعها في `public/images/demo/sham/` **بنفس اسم الملف** في الجدول — وأنا أربطها بالأصناف.

**البادئة (ثابتة لكل الصور حتى تبدو سلسلة واحدة):**
```
Top-down professional food photography of [DISH], served on a matte dark stone plate, on a warm neutral linen surface, soft natural window light from the left, subtle steam, fresh herbs garnish, authentic Syrian Damascene restaurant style, consistent styling for a restaurant menu series, appetizing, high detail, square 1:1, no text, no hands
```

| الصنف | اسم الملف | [DISH] |
|---|---|---|
| شيش طاووق | `shish-tawook.png` | grilled chicken shish tawook skewers with garlic toum sauce and grilled tomatoes |
| كباب حلبي | `kebab-halabi.png` | Aleppo-style lamb kebab skewers on flatbread with grilled onions and sumac |
| كباب بالكرز | `kebab-karaz.png` | Aleppo kebab with dark red sour cherry sauce on thin bread, sprinkled with parsley and pine nuts |
| شاورما لحمة | `shawarma-meat.png` | Syrian beef shawarma wrap in thin saj bread cut in half, with tahini sauce and pickles |
| فلافل | `falafel.png` | crispy falafel balls with tahini sauce, fresh vegetables and pickled turnips |
| حمص | `hummus.png` | creamy hummus with olive oil swirl, whole chickpeas and paprika |
| متبل | `mutabbal.png` | smoky eggplant mutabbal with tahini, pomegranate seeds and olive oil |
| محمرة | `muhammara.png` | red pepper and walnut muhammara dip with pomegranate molasses drizzle and walnuts |
| فتوش | `fattoush.png` | fattoush salad with crispy fried bread, fresh vegetables, mint and sumac |
| تبولة | `tabbouleh.png` | fresh tabbouleh salad with finely chopped parsley, bulgur, tomato and lemon |
| فتة حمص | `fatteh.png` | Damascene hummus fatteh in a deep bowl with yogurt, crispy bread, toasted pine nuts and ghee |
| كبة مقلية | `kibbeh.png` | four golden fried kibbeh balls, one cut open showing meat and walnut filling, with yogurt dip |
| يبرق | `yabraq.png` | rolled stuffed grape leaves yabraq with lemon slices |
| بوظة عربية بالفستق | `booza.png` | Syrian booza ice cream with ashta coated in crushed green pistachios in a glass bowl |
| حلاوة الجبن | `halawet-jibn.png` | halawet el jibn sweet cheese rolls filled with ashta cream, topped with pistachios and rose jam, syrup drizzle |
| عصير برتقال | `orange-juice.png` | fresh orange juice in a tall glass with an orange slice (side angle, not top-down) |
| ليموناضة بالنعنع | `lemon-mint.png` | frozen lemon mint lemonade in a tall glass with fresh mint leaves (side angle, not top-down) |
| عرق سوس | `erq-sous.png` | traditional Syrian licorice drink erq sous in a glass with a copper jug behind (side angle) |
| قهوة عربية | `arabic-coffee.png` | Arabic coffee in small cups with a brass dallah pot and dates |
| شاي | `tea.png` | Syrian black tea in a small clear glass tea cup with a sprig of mint on a brass tray |

> للمشروبات احذف كلمة «Top-down» من البادئة واستبدلها بـ «Eye-level».
