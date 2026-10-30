-- Add public content fields for restaurant menu page (hero + footer)
-- شغّل هذا السكربت من نفس مشروع Supabase الذي فيه جدول restaurants
alter table restaurants
  add column if not exists headline text,
  add column if not exists subheadline text,
  add column if not exists hero_background_url text,
  add column if not exists footer_note text;

