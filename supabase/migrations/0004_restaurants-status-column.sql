-- Optional: add status column to restaurants for super-admin (active, suspended, trial)
alter table public.restaurants
  add column if not exists status text default 'active';
