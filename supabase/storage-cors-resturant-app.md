# إعداد CORS لـ Supabase (حتى تظهر الصور على resturant.app)

عند فتح المنيو من نطاق فرعي مثل `albaraka.resturant.app`، المتصفح يطلب الصور من Supabase. إذا لم يكن النطاق مسموحاً في CORS، قد لا تظهر الصور.

## الطريقة الأولى: CORS من لوحة المشروع (تنطبق على الـ API والـ Storage)

1. افتح [Supabase Dashboard](https://supabase.com/dashboard) → اختر مشروعك.
2. من القائمة الجانبية: **Project Settings** (أيقونة الترس) → **API**.
3. في قسم **CORS** أو **Allowed Origins** أضف النطاقات التالية (مفصولة بفاصلة أو سطر جديد حسب الواجهة):
   - `https://resturant.app`
   - `https://albaraka.resturant.app`
   - `https://www.resturant.app`
   - لأي مطعم جديد لاحقاً أضف مثلاً: `https://اسمالمطعم.resturant.app`
4. احفظ التغييرات (**Save**).

## الطريقة الثانية: CORS للبكت فقط (إن وُجدت في واجهة Storage)

إذا ظهر في **Storage** → اختيار البكت **menu-images** → **Configuration** أو **CORS**، أضف نفس الـ origins أعلاه هناك أيضاً.

## بعد التعديل

أعد تحميل صفحة المنيو على `albaraka.resturant.app` وجرب الصور. إن استمرت المشكلة، تأكد أنك أعدت النشر (Redeploy) على Vercel بعد تعديل `next.config.ts` (إعداد `images.remotePatterns`).
