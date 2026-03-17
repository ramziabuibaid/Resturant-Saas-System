# 🎨 DESIGN_SYSTEM.md — Restaurant SaaS Dashboard
> أعطِ هذا الملف أولوية قصوى عند بناء أي واجهة في هذا المشروع.
> كل قرار تصميمي يجب أن يتبع هذا النظام بدقة.

---

## 🧭 الهوية البصرية والاتجاه التصميمي

### الرؤية
نبني لوحة تحكم **لمطاعم حقيقية** — بعضها فاخر وبعضها شعبي.
التصميم يجب أن يشعر بـ: **احترافي، نظيف، سريع الاستخدام، وعصري**.
المستخدم (صاحب المطعم) يستخدمها يومياً، لذا الراحة البصرية أولوية.

### الاتجاه: **Refined Utility Dark-First**
- مستوحى من: Linear App، Vercel Dashboard، Raycast
- ليس "ملونًا مبهجًا" — بل **واثق ومركّز**
- الـ Dark Mode هو الـ Default، والـ Light Mode أنيق وليس مجرد "عكس"

---

## 🎨 نظام الألوان (CSS Variables)

```css
:root {
  /* ===== LIGHT MODE ===== */

  /* Backgrounds */
  --bg-base:        #F8F7F4;   /* خلفية الصفحة الرئيسية — أبيض دافئ */
  --bg-surface:     #FFFFFF;   /* البطاقات والـ panels */
  --bg-surface-2:   #F1EFF9;   /* hover states، subtle sections */
  --bg-overlay:     #ECEAF6;   /* modals، popovers */

  /* Brand — لون رئيسي واحد فقط */
  --brand:          #5B4CF5;   /* بنفسجي عميق — accent رئيسي */
  --brand-light:    #EDE9FF;   /* خلفية خفيفة للـ brand */
  --brand-dark:     #4035C8;   /* hover على الـ brand */

  /* Text */
  --text-primary:   #0F0E17;   /* العناوين — شبه أسود */
  --text-secondary: #4A4869;   /* النصوص الثانوية */
  --text-muted:     #9896B0;   /* hints, placeholders */
  --text-inverse:   #FFFFFF;   /* نص على خلفيات داكنة */

  /* Borders */
  --border:         #E2E0EE;   /* حدود عادية */
  --border-strong:  #C8C5DF;   /* حدود مميزة */

  /* Status */
  --success:        #16A34A;
  --success-bg:     #DCFCE7;
  --warning:        #D97706;
  --warning-bg:     #FEF3C7;
  --danger:         #DC2626;
  --danger-bg:      #FEE2E2;
  --info:           #2563EB;
  --info-bg:        #DBEAFE;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(15, 14, 23, 0.06), 0 1px 2px rgba(15, 14, 23, 0.04);
  --shadow-md:  0 4px 12px rgba(15, 14, 23, 0.08), 0 2px 4px rgba(15, 14, 23, 0.04);
  --shadow-lg:  0 8px 24px rgba(15, 14, 23, 0.10), 0 4px 8px rgba(15, 14, 23, 0.06);
}

[data-theme="dark"] {
  /* ===== DARK MODE ===== */

  /* Backgrounds */
  --bg-base:        #0C0B14;   /* أسود مع لمسة بنفسجية */
  --bg-surface:     #13111F;   /* البطاقات */
  --bg-surface-2:   #1C1930;   /* hover states */
  --bg-overlay:     #221F35;   /* modals */

  /* Brand — أكثر إضاءة في الداكن */
  --brand:          #7C6FFA;
  --brand-light:    #1E1B3A;
  --brand-dark:     #9B90FB;

  /* Text */
  --text-primary:   #F0EEF8;
  --text-secondary: #9B98B8;
  --text-muted:     #5C5A78;
  --text-inverse:   #0C0B14;

  /* Borders */
  --border:         #1F1D30;
  --border-strong:  #302D4A;

  /* Status */
  --success:        #4ADE80;
  --success-bg:     #052E16;
  --warning:        #FCD34D;
  --warning-bg:     #1C1300;
  --danger:         #F87171;
  --danger-bg:      #2D0A0A;
  --info:           #60A5FA;
  --info-bg:        #0A1628;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-md:  0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg:  0 8px 24px rgba(0, 0, 0, 0.5);
}
```

---

## 🔤 نظام الخطوط (Typography)

### استيراد الخطوط
```html
<!-- في <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### في Tailwind أو CSS:
```css
--font-sans:  'Plus Jakarta Sans', sans-serif;  /* كل النصوص */
--font-mono:  'JetBrains Mono', monospace;       /* أرقام، كود، IDs */
```

### مقاييس الخطوط:
```
H1 (عنوان الصفحة):    32px / weight 700 / leading 1.2
H2 (عناوين الأقسام):  24px / weight 600 / leading 1.3
H3 (عناوين البطاقات): 18px / weight 600 / leading 1.4
H4 (labels كبيرة):    14px / weight 600 / leading 1.5 / UPPERCASE + letter-spacing: 0.06em
Body Large:            16px / weight 400 / leading 1.7
Body:                  14px / weight 400 / leading 1.6
Small / Caption:       12px / weight 500 / leading 1.5
Mono (أرقام):         14px / weight 500 / font-mono
```

---

## 📐 نظام المسافات والأبعاد

```css
/* Spacing Scale — كل القيم من هذا الـ scale فقط */
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px

/* Border Radius */
--radius-sm: 6px    /* buttons صغيرة، badges */
--radius-md: 10px   /* buttons عادية، inputs */
--radius-lg: 14px   /* بطاقات */
--radius-xl: 20px   /* modals، panels كبيرة */

/* Sidebar */
--sidebar-width: 240px
--sidebar-collapsed: 64px

/* Header */
--header-height: 60px
```

---

## 🏗️ هيكل لوحة التحكم (Layout)

### البنية العامة:
```
┌─────────────────────────────────────────────────┐
│  HEADER (60px) — Logo | Search | Theme | User    │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ SIDEBAR  │         MAIN CONTENT                  │
│ (240px)  │    (padding: 32px)                    │
│          │                                       │
│ Nav Items│   ┌──────────┐  ┌──────────┐         │
│          │   │  Card    │  │  Card    │         │
│          │   └──────────┘  └──────────┘         │
│          │                                       │
│ [bottom] │                                       │
│ Settings │                                       │
│ Profile  │                                       │
└──────────┴──────────────────────────────────────┘
```

### قواعد اللayout:
- الـ Sidebar ثابت (sticky) لا يتحرك مع الـ scroll
- الـ Main Content يملأ باقي العرض مع `overflow-y: auto`
- على الموبايل: الـ Sidebar يصبح Drawer يفتح من اليسار
- الـ Grid للبطاقات: `grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`

---

## 🧩 مكونات UI — التصميم التفصيلي

### 1. الـ Sidebar

```
الخلفية: --bg-surface مع border-right: 1px solid --border
Logo في الأعلى: 60px height مع padding: 0 20px
Nav Items: height 40px، padding: 0 12px، border-radius: 8px
  - Icon (20px) + Label + optional Badge
  - Hover: background --bg-surface-2
  - Active: background --brand-light، color --brand، icon colored
مجموعات الـ Nav مفصولة بـ divider + label صغير (MENU, ORDERS, SYSTEM)
Profile section في الأسفل مع avatar + name + role
```

### 2. الـ Header

```
الخلفية: --bg-surface مع backdrop-filter: blur(12px) و border-bottom
اليسار: اسم المطعم (Restaurant Name)
الوسط: Search bar بارز (Cmd+K)
اليمين: [Theme Toggle] [Notifications Bell] [Avatar + Dropdown]
```

### 3. بطاقات الإحصاء (Stats Cards)

```css
/* بطاقة الإحصاء */
.stat-card {
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s, transform 0.2s;
}
.stat-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* محتوى البطاقة */
.stat-label  { font-size: 12px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.stat-value  { font-size: 32px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary); margin: 8px 0 4px; }
.stat-change { font-size: 13px; color: var(--success); display: flex; align-items: center; gap: 4px; }
.stat-icon   { width: 40px; height: 40px; border-radius: 10px; background: var(--brand-light); color: var(--brand); display: flex; align-items: center; justify-content: center; }
```

### 4. الجداول (Data Tables)

```
Header row: bg --bg-surface-2، font-size 11px، uppercase، letter-spacing
Body rows: border-bottom 1px solid --border، height 52px
Hover row: bg --bg-surface-2
Selected row: bg --brand-light، border-right 2px solid --brand
Cells: padding 0 16px، text-align start
Actions column: اليمين، opacity 0 → 1 عند hover على الـ row
Status badges: pill shape، background + text من نفس الـ semantic color
```

### 5. الـ Buttons

```css
/* Primary */
.btn-primary {
  background: var(--brand);
  color: white;
  height: 38px;
  padding: 0 16px;
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 14px;
  transition: background 0.15s, transform 0.1s;
}
.btn-primary:hover { background: var(--brand-dark); }
.btn-primary:active { transform: scale(0.98); }

/* Secondary */
.btn-secondary {
  background: var(--bg-surface-2);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

/* Danger */
.btn-danger {
  background: var(--danger-bg);
  color: var(--danger);
  border: 1px solid var(--danger);
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-ghost:hover { background: var(--bg-surface-2); color: var(--text-primary); }
```

### 6. الـ Inputs والـ Forms

```css
.input {
  height: 40px;
  padding: 0 12px;
  background: var(--bg-base);
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  color: var(--text-primary);
  transition: border-color 0.15s, box-shadow 0.15s;
  width: 100%;
}
.input:focus {
  outline: none;
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-light);
}
.input::placeholder { color: var(--text-muted); }

/* Label */
.label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 6px;
  display: block;
}
```

### 7. الـ Badges والـ Status Pills

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border-radius: 100px; /* pill */
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
}

/* مثال: باج "نشط" */
.badge-success { background: var(--success-bg); color: var(--success); }
/* مثال: باج "معلق" */
.badge-warning { background: var(--warning-bg); color: var(--warning); }
/* مثال: باج "متاح/غير متاح" */
.badge-info    { background: var(--info-bg);    color: var(--info); }
```

---

## 🌙 نظام الـ Dark/Light Mode

### التطبيق في React + Next.js:

```tsx
// components/ThemeProvider.tsx
'use client'
import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

const ThemeContext = createContext<{
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (t: Theme) => void
}>({ theme: 'system', resolvedTheme: 'dark', setTheme: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme || 'system'
    setThemeState(stored)
    applyTheme(stored)
  }, [])

  function applyTheme(t: Theme) {
    const isDark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
    setResolvedTheme(isDark ? 'dark' : 'light')
  }

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

### زر التبديل بين المودين:

```tsx
// components/ThemeToggle.tsx
'use client'
import { useTheme } from './ThemeProvider'
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="theme-toggle-btn"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <SunIcon style={{ width: 18, height: 18 }} />
      ) : (
        <MoonIcon style={{ width: 18, height: 18 }} />
      )}
    </button>
  )
}
```

```css
.theme-toggle-btn {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-2);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.theme-toggle-btn:hover {
  background: var(--bg-overlay);
  color: var(--text-primary);
}
```

---

## 🎭 الحركة والانيميشن

### مبادئ الحركة:
- سريعة وخفيفة — لا شيء أبطأ من 300ms للـ interactions
- `ease-out` للعناصر الداخلة، `ease-in` للخارجة
- لا تحرك أكثر من 3 عناصر في نفس الوقت

```css
/* Page transitions */
.page-enter {
  animation: fadeSlideIn 0.25s ease-out forwards;
}
@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Card stagger animation */
.card { animation: cardEnter 0.3s ease-out backwards; }
.card:nth-child(1) { animation-delay: 0.05s; }
.card:nth-child(2) { animation-delay: 0.10s; }
.card:nth-child(3) { animation-delay: 0.15s; }
.card:nth-child(4) { animation-delay: 0.20s; }

@keyframes cardEnter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* Smooth transitions لكل العناصر التفاعلية */
* { transition-property: background-color, border-color, color, box-shadow;
    transition-duration: 150ms;
    transition-timing-function: ease; }

/* Skeleton loading */
.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-surface-2) 25%,
    var(--bg-overlay) 50%,
    var(--bg-surface-2) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: var(--radius-sm);
}
@keyframes shimmer {
  from { background-position: 200% 0; }
  to   { background-position: -200% 0; }
}
```

---

## 📱 الـ Responsive Design

```css
/* Breakpoints */
--mobile:  640px   /* sm */
--tablet:  768px   /* md */
--laptop:  1024px  /* lg */
--desktop: 1280px  /* xl */

/* Layout المتجاوب */
@media (max-width: 768px) {
  /* Sidebar يصبح drawer مخفي */
  .sidebar { transform: translateX(-100%); position: fixed; z-index: 50; }
  .sidebar.open { transform: translateX(0); box-shadow: var(--shadow-lg); }

  /* Stats grid: 2 columns */
  .stats-grid { grid-template-columns: 1fr 1fr; }

  /* Header: بدون search bar، يصبح icon فقط */
}

@media (max-width: 640px) {
  /* Stats grid: 1 column */
  .stats-grid { grid-template-columns: 1fr; }
  .page-padding { padding: 16px; }
}
```

---

## 🧱 مكونات جاهزة للاستخدام في لوحات التحكم

### ما يجب بناؤه لـ Super Admin Dashboard:
1. **Stats Row**: إجمالي المطاعم، النشطة، الإيرادات الشهرية، الطلبات اليوم
2. **Recent Restaurants Table**: اسم، subdomain، الحالة، تاريخ الإنشاء، actions
3. **Quick Actions**: إضافة مطعم، إرسال إشعار، تصدير البيانات
4. **Activity Feed**: آخر المطاعم المسجلة، آخر الاشتراكات

### ما يجب بناؤه لـ Restaurant Admin Dashboard:
1. **Stats Row**: طلبات اليوم، إيرادات اليوم، أصناف المنيو، متوسط التقييم
2. **Recent Orders Table**: رقم الطلب، الزبون، المبلغ، الحالة
3. **Popular Items**: أكثر الأصناف طلباً (bar chart بسيط)
4. **Quick Actions**: إضافة صنف، عرض المنيو، إعدادات المطعم

---

## 🚫 ممنوع في هذا المشروع

```
❌ Bootstrap أو أي CSS framework جاهز كامل
❌ ألوان متشابكة بدون نظام واضح
❌ shadows مبالغ فيها أو ملونة
❌ gradients زاهية على خلفيات واسعة
❌ fonts: Arial, Roboto, Inter, system-ui (تجنبها)
❌ نص أبيض على خلفية بيضاء أو العكس
❌ border-radius أكثر من 20px على البطاقات العادية
❌ animations أبطأ من 400ms
❌ z-index عشوائية (استخدم: 10، 20، 30، 50، 100 فقط)
❌ تحديد ألوان بـ hex مباشرة في الـ components — استخدم variables دائماً
```

---

## ✅ Checklist قبل تسليم أي واجهة

```
[ ] كل الألوان من CSS variables (لا hex مباشر في components)
[ ] الـ Dark Mode يعمل بدون أي text أسود على خلفية داكنة
[ ] كل الـ interactive elements لها hover + focus states
[ ] الـ loading states موجودة (skeleton أو spinner)
[ ] الـ empty states موجودة (عندما تكون القائمة فارغة)
[ ] الخطأ (error state) معروض بشكل واضح
[ ] الموبايل (768px) يعمل بدون overflow أفقي
[ ] الـ transitions سلسة بين الـ Dark/Light mode
[ ] لا يوجد console errors أو warnings
[ ] الـ buttons لها disabled state مناسب
```

---

## 🎯 الـ Tailwind Config (إذا كان المشروع يستخدم Tailwind)

```js
// tailwind.config.js
module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'var(--brand)',
          light:   'var(--brand-light)',
          dark:    'var(--brand-dark)',
        },
        bg: {
          base:      'var(--bg-base)',
          surface:   'var(--bg-surface)',
          'surface-2': 'var(--bg-surface-2)',
          overlay:   'var(--bg-overlay)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong:  'var(--border-strong)',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
}
```

---

*هذا النظام مرجعي دائم. أي إضافة لصفحة أو component جديد يجب أن يتبعه.*
