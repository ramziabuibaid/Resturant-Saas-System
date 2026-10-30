-- Allow super_admin users to have no restaurant (restaurant_id nullable).
-- Run after profiles-table.sql. Then set your system owner:
--   UPDATE public.profiles SET role = 'super_admin', restaurant_id = NULL WHERE id = '<your-user-uuid>';
-- If the table has NOT NULL on restaurant_id, run:
alter table public.profiles
  alter column restaurant_id drop not null;

-- Optional: ensure default for new rows remains 'owner'
-- alter table public.profiles alter column role set default 'owner';
