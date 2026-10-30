-- =============================================================================
-- الجداول الأساسية (لم تكن موجودة كملف — أُعيد بناؤها من قاعدة البيانات الفعلية 2026-10-30)
-- الأعمدة الإضافية تُضاف في الملفات التالية بالترتيب.
-- آمن للتشغيل أكثر من مرة.
-- =============================================================================

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  custom_domain text unique,
  logo_url text,
  created_at timestamptz default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  order_index integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  category_id uuid references public.categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric not null,
  image_url text,
  is_available boolean default true,
  created_at timestamptz default now()
);

alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
