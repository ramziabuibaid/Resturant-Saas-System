# 📌 SYSTEM_CONTEXT.md — Multi-Tenant Restaurant SaaS
> **أهمية قصوى:** اقرأ هذا الملف بالكامل قبل كتابة أي كود أو اقتراح أي تعديل.
> هذا الملف هو المرجع الرئيسي لفهم هيكلية المشروع بالكامل.

---

## 🧠 ما هو هذا النظام؟

هذا نظام **Multi-Tenant SaaS** مخصص لإدارة المطاعم.
الفكرة الجوهرية: **كودبيس واحد، قاعدة بيانات واحدة، يخدم مئات المطاعم المختلفة — كل مطعم له هويته المستقلة تماماً.**

النموذج الأقرب لما نبنيه: **Shopify للمطاعم.**
- Shopify = كود واحد → يخدم ملايين المتاجر، كل متجر بدومين خاص
- نظامنا  = كود واحد → يخدم مئات المطاعم، كل مطعم بدومين خاص + لوحة تحكم خاصة

**المالك (Super Admin) = نحن**، يتحكم بكل شيء من لوحة مركزية.
**المطعم (Tenant/Owner)** = زبون مشترك، يتحكم فقط ببيانات مطعمه.

---

## 🏗️ الهيكلية التقنية الجوهرية

### المبدأ الأساسي: Subdomain/Domain → Tenant Resolution

عندما يأتي أي طلب HTTP إلى التطبيق، **أول شيء يحدث** هو قراءة الـ `hostname` وتحديد:
- هل هذا طلب من مطعم معين؟ (subdomain أو custom domain)
- أم هذا طلب للنظام الرئيسي؟ (بدون subdomain)

```
albaraka.localhost:3000  →  tenant = "albaraka"  →  بيانات مطعم البركة
pizza.localhost:3000     →  tenant = "pizza"      →  بيانات مطعم البيتزا
localhost:3000           →  tenant = null         →  النظام الرئيسي (Super Admin)
```

### في الإنتاج (Production):
```
albaraka.yourdomain.com     →  tenant = "albaraka"
pizza-world.com             →  custom domain → tenant resolved من DB
yourdomain.com              →  Super Admin panel
```

---

## 🗺️ خريطة الـ Routes الكاملة

### ❶ Super Admin Routes — `localhost:3000` (بدون subdomain)

هذه المنطقة لمالك النظام **فقط**. لا يمكن لأي مطعم الوصول إليها.

```
localhost:3000/                     → redirect to /admin/login
localhost:3000/admin/login          → صفحة تسجيل دخول Super Admin
localhost:3000/admin/               → لوحة التحكم الرئيسية (dashboard عام)
localhost:3000/admin/restaurants    → قائمة كل المطاعم المشتركة
localhost:3000/admin/restaurants/new       → إضافة مطعم جديد
localhost:3000/admin/restaurants/[id]      → تفاصيل مطعم معين
localhost:3000/admin/restaurants/[id]/edit → تعديل مطعم
localhost:3000/admin/subscriptions  → إدارة الاشتراكات والمدفوعات
localhost:3000/admin/settings       → إعدادات النظام العامة
```

**من يملك حق الدخول؟**
المستخدمون الذين `role = 'super_admin'` في جدول `profiles`.

---

### ❷ Restaurant Admin Routes — `[subdomain].localhost:3000` (مع subdomain)

هذه المنطقة **لصاحب مطعم محدد فقط**. كل مطعم يرى بياناته فقط.

```
albaraka.localhost:3000/                    → redirect لصفحة المنيو العامة
albaraka.localhost:3000/admin/              → لوحة تحكم مطعم البركة
albaraka.localhost:3000/admin/login         → تسجيل دخول صاحب البركة
albaraka.localhost:3000/admin/menu          → إدارة المنيو
albaraka.localhost:3000/admin/menu/new      → إضافة صنف جديد
albaraka.localhost:3000/admin/categories    → إدارة التصنيفات
albaraka.localhost:3000/admin/orders        → الطلبات الواردة
albaraka.localhost:3000/admin/settings      → إعدادات المطعم (اسم، شعار، ألوان)
```

**من يملك حق الدخول؟**
المستخدمون الذين `role = 'owner'` **و** `restaurant_id` يساوي ID مطعم البركة.

---

### ❸ Public Routes — الواجهة العامة للزبائن

```
albaraka.localhost:3000/           → صفحة المنيو العامة لمطعم البركة
albaraka.localhost:3000/menu       → المنيو الكامل
albaraka.localhost:3000/item/[id]  → تفاصيل صنف معين
albaraka.localhost:3000/order      → صفحة الطلب (مستقبلاً)
```

---

## 🔄 كيف يعمل الـ Middleware

الـ Middleware هو **قلب النظام**. يعمل قبل كل request.

```typescript
// middleware.ts — في جذر المشروع
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()

  // --- استخراج الـ subdomain ---
  // في التطوير: albaraka.localhost:3000
  // في الإنتاج: albaraka.yourdomain.com
  
  const isLocalDev = hostname.includes('localhost')
  let subdomain: string | null = null

  if (isLocalDev) {
    // albaraka.localhost:3000 → subdomain = "albaraka"
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'www') {
      subdomain = parts[0]
    }
  } else {
    // في الإنتاج
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN // e.g. "yourdomain.com"
    if (hostname !== rootDomain && hostname !== `www.${rootDomain}`) {
      // إما subdomain أو custom domain
      if (hostname.endsWith(`.${rootDomain}`)) {
        subdomain = hostname.replace(`.${rootDomain}`, '')
      } else {
        // custom domain مثل pizza-world.com → نبحث عنه في DB
        // نضعه في header ليقرأه التطبيق
        request.headers.set('x-custom-domain', hostname)
      }
    }
  }

  // --- التوجيه ---
  if (subdomain) {
    // هذا طلب خاص بمطعم
    url.searchParams.set('subdomain', subdomain)
    // يمكن أيضاً إعادة الكتابة لـ /[tenant]/...
    return NextResponse.rewrite(url)
  }

  // بدون subdomain = Super Admin zone
  // لا تعديل، المسار يمضي عاديًا
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico).*)'],
}
```

---

## 🗄️ قاعدة البيانات — الجداول والعلاقات

### جدول `restaurants` — سجل كل المطاعم
```sql
id           uuid  PK
name         text  -- "مطعم البركة"
subdomain    text  UNIQUE -- "albaraka"
custom_domain text UNIQUE -- "albaraka-restaurant.com" (اختياري)
logo_url     text
status       text  -- 'active' | 'suspended' | 'trial'
created_at   timestamptz
```

### جدول `profiles` — المستخدمون
```sql
id             uuid PK → references auth.users(id)
restaurant_id  uuid → references restaurants(id)  -- NULL إذا كان super_admin
full_name      text
role           text -- 'super_admin' | 'owner'
updated_at     timestamptz
```

**قاعدة مهمة:**
- `role = 'super_admin'` + `restaurant_id = NULL` → مالك النظام
- `role = 'owner'` + `restaurant_id = [uuid]` → صاحب مطعم محدد

### جدول `categories` — تصنيفات المنيو
```sql
id            uuid PK
restaurant_id uuid → references restaurants(id) ON DELETE CASCADE
name          text -- "مشويات" | "مقبلات" | "مشروبات"
order_index   integer
created_at    timestamptz
```

### جدول `menu_items` — أصناف المنيو
```sql
id            uuid PK
restaurant_id uuid → references restaurants(id) ON DELETE CASCADE
category_id   uuid → references categories(id) ON DELETE CASCADE
name          text
description   text
price         numeric
image_url     text
is_available  boolean
created_at    timestamptz
```

### العلاقات البصرية:
```
restaurants (1)
    ├── profiles (many) — أصحاب المطاعم
    ├── categories (many) — تصنيفات المنيو
    │       └── menu_items (many) — الأصناف
    └── menu_items (many) — مباشرة أيضاً
```

---

## 🔐 نظام المصادقة والصلاحيات

### القاعدة الذهبية: عزل المستأجرين (Tenant Isolation)

كل query تتعامل مع بيانات مطعم **يجب** أن تحتوي على `restaurant_id` في الـ WHERE clause.
لا يوجد استثناء لهذه القاعدة.

```typescript
// ✅ صحيح
const items = await supabase
  .from('menu_items')
  .select('*')
  .eq('restaurant_id', currentRestaurantId)

// ❌ خطأ — يجلب بيانات كل المطاعم!
const items = await supabase
  .from('menu_items')
  .select('*')
```

### Row Level Security (RLS) في Supabase

يجب تفعيل RLS على كل جدول:

```sql
-- مثال لجدول menu_items
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- صاحب المطعم يرى فقط أصناف مطعمه
CREATE POLICY "owner_sees_own_items" ON menu_items
  FOR ALL
  USING (
    restaurant_id = (
      SELECT restaurant_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Super Admin يرى كل شيء
CREATE POLICY "super_admin_sees_all" ON menu_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

---

## 📁 هيكل المجلدات في Next.js (App Router)

```
app/
├── (super-admin)/                  ← لوحة تحكم المالك — localhost:3000
│   ├── admin/
│   │   ├── layout.tsx              ← تحقق من role = 'super_admin'
│   │   ├── page.tsx                ← Dashboard العام
│   │   ├── restaurants/
│   │   │   ├── page.tsx            ← قائمة المطاعم
│   │   │   ├── new/page.tsx        ← إضافة مطعم
│   │   │   └── [id]/page.tsx       ← تفاصيل مطعم
│   │   └── subscriptions/page.tsx
│   └── login/page.tsx
│
├── (restaurant-admin)/             ← لوحة تحكم المطعم — [sub].localhost:3000
│   ├── admin/
│   │   ├── layout.tsx              ← تحقق من subdomain + role = 'owner'
│   │   ├── page.tsx                ← Dashboard المطعم
│   │   ├── menu/
│   │   │   ├── page.tsx            ← قائمة الأصناف
│   │   │   └── new/page.tsx        ← إضافة صنف
│   │   ├── categories/page.tsx
│   │   ├── orders/page.tsx
│   │   └── settings/page.tsx
│   └── login/page.tsx
│
├── (public)/                       ← الواجهة العامة للزبائن
│   ├── page.tsx                    ← المنيو العام
│   ├── menu/page.tsx
│   └── item/[id]/page.tsx
│
└── api/
    ├── restaurants/route.ts        ← CRUD للمطاعم (super admin فقط)
    ├── menu-items/route.ts         ← CRUD للمنيو
    └── auth/route.ts
```

---

## 🔑 كيف يعرف التطبيق "أي مطعم" في كل صفحة؟

```typescript
// lib/get-tenant.ts — دالة مساعدة تُستخدم في كل مكان

import { headers } from 'next/headers'
import { supabase } from './supabase'

export async function getCurrentTenant() {
  const headersList = headers()
  const hostname = headersList.get('host') || ''
  
  // استخراج subdomain
  const subdomain = extractSubdomain(hostname)
  
  if (!subdomain) {
    return null // نحن في zone الـ Super Admin
  }
  
  // جلب بيانات المطعم من DB
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single()
  
  return restaurant
}
```

---

## 🚦 منطق حماية الـ Routes

### في layout.tsx لـ Super Admin:
```typescript
// app/(super-admin)/admin/layout.tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase-server'
import { getCurrentTenant } from '@/lib/get-tenant'

export default async function SuperAdminLayout({ children }) {
  // 1. تأكد أننا في zone بدون subdomain
  const tenant = await getCurrentTenant()
  if (tenant) redirect('/') // إذا كان هناك subdomain، ليس مكانك هنا

  // 2. تأكد من تسجيل الدخول
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 3. تأكد أن الدور هو super_admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  
  if (profile?.role !== 'super_admin') redirect('/')

  return <>{children}</>
}
```

### في layout.tsx لـ Restaurant Admin:
```typescript
// app/(restaurant-admin)/admin/layout.tsx
export default async function RestaurantAdminLayout({ children }) {
  // 1. تأكد أن هناك subdomain
  const tenant = await getCurrentTenant()
  if (!tenant) redirect('/') // بدون مطعم، ليس مكانك هنا

  // 2. تأكد من تسجيل الدخول
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login`) // redirect لصفحة login المطعم

  // 3. تأكد أن المستخدم ينتمي لهذا المطعم تحديداً
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, restaurant_id')
    .eq('id', user.id)
    .single()
  
  if (profile?.restaurant_id !== tenant.id) redirect('/')

  return <RestaurantContext.Provider value={tenant}>{children}</RestaurantContext.Provider>
}
```

---

## ⚠️ الأخطاء الشائعة التي يجب تجنبها

### ❌ الخطأ رقم 1: لوحة تحكم بدون tenant isolation
```typescript
// خطأ: يعطي صاحب مطعم البركة رؤية كل المطاعم
const restaurants = await supabase.from('restaurants').select('*')
```

### ❌ الخطأ رقم 2: route واحد لكل شيء
```
// خطأ: localhost:3000/admin يفتح لوحة أي مطعم
// الصحيح: localhost:3000/admin = Super Admin فقط
//          albaraka.localhost:3000/admin = لوحة البركة فقط
```

### ❌ الخطأ رقم 3: تجاهل الـ subdomain في قراءة البيانات
```typescript
// خطأ: يجلب أصناف بناءً على user فقط دون التحقق من المطعم
const items = await supabase
  .from('menu_items')
  .select('*')
  .eq('owner_id', userId) // خطأ! لا يوجد owner_id، يوجد restaurant_id

// الصحيح
const tenant = await getCurrentTenant() // من الـ subdomain
const items = await supabase
  .from('menu_items')
  .select('*')
  .eq('restaurant_id', tenant.id) // صحيح
```

---

## 🌐 إعداد بيئة التطوير للـ Subdomains

للتجربة محلياً مع subdomains، أضف في ملف `/etc/hosts`:
```
127.0.0.1  localhost
127.0.0.1  albaraka.localhost
127.0.0.1  pizza.localhost
127.0.0.1  sushi.localhost
```

وفي ملف `.env.local`:
```env
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

---

## 📊 ملخص تدفق البيانات الكامل

```
المستخدم يفتح: albaraka.localhost:3000/admin/menu
        ↓
middleware.ts يقرأ hostname → subdomain = "albaraka"
        ↓
getCurrentTenant() → يبحث في DB عن restaurants WHERE subdomain = "albaraka"
        ↓
يجد: { id: "uuid-123", name: "مطعم البركة", ... }
        ↓
layout.tsx للـ Restaurant Admin:
  - يتحقق: هل المستخدم مسجل دخول؟
  - يتحقق: هل profile.restaurant_id === "uuid-123"؟
        ↓
page.tsx يجلب: menu_items WHERE restaurant_id = "uuid-123"
        ↓
يعرض منيو مطعم البركة فقط ✅
```

---

## 🔖 المصطلحات المستخدمة في هذا المشروع

| المصطلح | المعنى |
|---------|--------|
| Tenant | مطعم مشترك في النظام |
| Super Admin | مالك النظام بالكامل |
| Owner | صاحب مطعم محدد |
| Subdomain | الجزء قبل النقطة: `albaraka`.localhost |
| Custom Domain | دومين خاص بالمطعم: `albaraka-rest.com` |
| Tenant Isolation | عزل بيانات كل مطعم عن الآخر |
| RLS | Row Level Security في Supabase |

---

*آخر تحديث: يرجى عدم تعديل هذا الملف إلا بعد التنسيق مع مالك المشروع.*
