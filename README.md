# Restaurant SaaS – Next.js + Supabase

Multi-tenant restaurant menu app. Each restaurant has a **subdomain** (e.g. `pizza-place.yourdomain.com`). The middleware detects the subdomain, looks it up in Supabase `restaurants`, and rewrites to a dynamic route that shows that restaurant’s menu.

## Stack

- **Next.js 16** (App Router) + **Tailwind CSS**
- **Supabase** (Postgres, Auth, optional Storage for images)
- **Middleware** for hostname → subdomain → rewrite to `/menu/[slug]`

## Setup

### 1. Environment

Copy the example env and set your Supabase keys:

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` – from Supabase → Project Settings → API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – same place (anon/public key)
- `SUPABASE_SERVICE_ROLE_KEY` – (optional) from same place, **Service role** key. Required for Super Admin to create/change restaurant owner login (username + password). **Never expose this in the client.**

### 2. Database (Supabase SQL Editor)

Run this in the Supabase SQL Editor to create the required tables:

```sql
-- Restaurants (one per tenant; subdomain must be unique)
create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Menu items per restaurant
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  price integer not null,  -- store in cents
  image_url text,
  category text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS: allow public read so /menu/[subdomain] works for anonymous users
alter table public.restaurants enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;

create policy "Restaurants are viewable by everyone"
  on public.restaurants for select using (true);
create policy "Categories are viewable by everyone"
  on public.categories for select using (true);
create policy "Menu items are viewable by everyone"
  on public.menu_items for select using (true);

-- Optional: only authenticated users can insert/update (e.g. restaurant owners)
-- create policy "Restaurant owners can update own restaurant" on public.restaurants ...
```

Insert a test restaurant and menu items:

```sql
insert into public.restaurants (name, subdomain) values
  ('Pizza Place', 'pizza-place'),
  ('Taco Spot', 'taco-spot');

insert into public.menu_items (restaurant_id, name, description, price, category)
select id, 'Margherita', 'Tomato, mozzarella, basil', 1299, 'Pizza'
from public.restaurants where subdomain = 'pizza-place';

insert into public.menu_items (restaurant_id, name, description, price, category)
select id, 'Pepperoni', 'Pepperoni, tomato, mozzarella', 1399, 'Pizza'
from public.restaurants where subdomain = 'pizza-place';
```

### 3. Supabase Auth (optional)

Auth is wired via:

- **Server client** in `src/lib/supabase/server.ts` (cookies)
- **Browser client** in `src/lib/supabase/client.ts`
- **Auth callback** at `src/app/auth/callback/route.ts` for OAuth / magic link

In Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: your production URL (e.g. `https://yourdomain.com`)
- **Redirect URLs**: add `https://yourdomain.com/auth/callback` and `http://localhost:3000/auth/callback`

Then use `createClient()` from `@/lib/supabase/server` or `@/lib/supabase/client` and call `supabase.auth.signInWithOAuth()`, `signInWithPassword()`, etc. Redirect to `/auth/callback` (or use the built-in redirect) after sign-in.

### 4. Run the app

```bash
npm install
npm run dev
```

- **Main site**: open `http://localhost:3000` (no subdomain → no rewrite).
- **Subdomain (local)**: to test subdomains on localhost, use e.g. `http://pizza-place.localhost:3000`. Your OS may resolve `*.localhost` to `127.0.0.1`; if not, add to `/etc/hosts`:  
  `127.0.0.1 pizza-place.localhost`

In production, point a wildcard DNS (e.g. `*.yourdomain.com`) to your host and use real subdomains (e.g. `pizza-place.yourdomain.com`).

## How it works

1. **Middleware** (`src/middleware.ts`):  
   Reads the request hostname, extracts the first segment as subdomain (ignoring `www` / `app`). If a subdomain exists, it queries Supabase `restaurants` by `subdomain`. If a row is found, it **rewrites** the request to `/menu/[subdomain]`.

2. **Menu page** (`src/app/(restaurant)/menu/[subdomain]/page.tsx`):  
   Loads the restaurant by subdomain and its `menu_items` (grouped by category). Uses the server Supabase client and Tailwind layout.

3. **Auth**:  
   Use the server and browser Supabase clients for protected routes; the auth callback route exchanges the code for a session.

## Project structure

- `src/middleware.ts` – hostname → subdomain → Supabase lookup → rewrite
- `src/app/(restaurant)/menu/[subdomain]/page.tsx` – public menu by subdomain
- `src/lib/supabase/` – Supabase client (browser, server, edge/middleware)
- `src/lib/types/database.ts` – `Restaurant`, `MenuItem` types
- `src/app/auth/callback/route.ts` – Supabase Auth redirect handler

## Troubleshooting: 404 on /menu/[subdomain]

If a route like `/menu/albaraka` returns 404 but the restaurant exists in Supabase:

1. **RLS (Row Level Security)** – The app uses the **anon** key. If RLS is enabled on `restaurants`, `categories`, or `menu_items` without a policy that allows `SELECT` for unauthenticated users, queries return no rows and the page 404s. Fix: run the policies in **`supabase/rls-public-menu.sql`** in the Supabase SQL Editor (or add equivalent policies so public read is allowed on those tables).

2. **Column name** – The app queries by the **`subdomain`** column. If your table uses a different column (e.g. `slug`), either add a `subdomain` column and sync it, or change the code to use your column.

3. **Case** – Matching is **case-insensitive** (`.ilike('subdomain', slug)`), so `albaraka` matches `Albaraka` in the database.

4. **Debug** – Call `GET /api/debug-menu?subdomain=albaraka` (see below) to see the raw Supabase response and any error message.

## Owner Dashboard (`/admin`)

The dashboard is **protected**: unauthenticated users are redirected to **`/login`**.

1. **Auth** – Sign in with email/password (Supabase Auth). On login, the app reads **`profiles.restaurant_id`** for the current user and scopes all data to that restaurant (multi-tenancy).
2. **Profiles table** – Run **`supabase/profiles-table.sql`** in the SQL Editor. Then insert a row per owner: `insert into profiles (user_id, restaurant_id) values ('<auth.users.id>', '<restaurants.id>');`
3. **Layout** – **shadcn/ui** sidebar with **Categories** and **Menu Items**. The header shows the **restaurant name** from the `restaurants` table.
4. **Categories** – **`/admin/categories`**: full CRUD (list, add, edit, delete) via Server Actions. Optimistic UI for a snappy feel.
5. **Menu Items** – **`/admin/items`**: full CRUD. Form: Name, Description, Price (in **dollars**, e.g. 50.00; stored as cents in DB), Category dropdown, image upload to **menu-images** bucket. Edit/Delete with confirmation. Optimistic delete.

**Price:** Stored as **integer cents** in `menu_items.price`. The UI shows dollars (e.g. 50.00) and converts to cents on save so 50.00 stays 50.00.

**Dashboard setup:**

1. **Storage bucket** – In Supabase Dashboard → Storage, create a bucket with id `menu-images` and set it to **Public**. Then run `supabase/storage-menu-images.sql` in the SQL Editor to add policies.
2. **Admin RLS** – Run `supabase/rls-admin-menu-items.sql` so the app can insert/update/delete `menu_items` (anon allowed; tighten to authenticated users when you add auth).

## Deploy

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your host’s environment. Ensure your production domain has wildcard subdomains (e.g. `*.yourdomain.com`) pointing at the same app so middleware can see the correct hostname.
