-- =============================================================================
-- Profiles table: links auth users to a restaurant (multi-tenancy)
-- =============================================================================
-- profiles.id = auth.users.id (the user's UUID from Authentication).
-- After running this script:
--   1. New owner: insert into profiles (id, restaurant_id) values ('<user-uuid-from-auth>', '<restaurant-uuid>');
--   2. Or get user id from Dashboard → Authentication → Users, and restaurant id from Table Editor → restaurants.
--   3. If the table already had rows (e.g. from Supabase Auth): update profiles set restaurant_id = '<restaurant-id>' where id = '<user-id>';
-- =============================================================================

-- Drop existing policies if you're re-running (they may reference old column names)
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Allow insert own profile" on public.profiles;

-- Option A: If you do NOT have a profiles table yet, create it:
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role text default 'owner',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Option B: If Supabase already created a profiles table (e.g. with id, email, full_name),
-- add the columns we need instead of creating the table:
alter table public.profiles
  add column if not exists restaurant_id uuid references public.restaurants(id) on delete cascade,
  add column if not exists role text default 'owner';

-- Make restaurant_id required for existing rows: run after backfilling data
-- alter table public.profiles alter column restaurant_id set not null;

alter table public.profiles enable row level security;

-- Users can read their own profile (id = auth.uid())
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Allow insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
