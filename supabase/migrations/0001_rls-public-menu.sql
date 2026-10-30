-- =============================================================================
-- RLS policies for public menu access
-- =============================================================================
-- Run this in the Supabase SQL Editor if /menu/[subdomain] returns 404 even
-- when the restaurant exists. RLS (Row Level Security) blocks anonymous reads
-- unless these policies exist.
--
-- Optional: skip this file if you already allow public read via other policies.
-- =============================================================================

-- Enable RLS on tables (if not already)
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if you're re-running (adjust names if you use different ones)
DROP POLICY IF EXISTS "Public can read restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Public can read categories" ON public.categories;
DROP POLICY IF EXISTS "Public can read menu_items" ON public.menu_items;

-- Allow anyone (including unauthenticated) to SELECT restaurants
CREATE POLICY "Public can read restaurants"
  ON public.restaurants
  FOR SELECT
  USING (true);

-- Allow anyone to SELECT categories
CREATE POLICY "Public can read categories"
  ON public.categories
  FOR SELECT
  USING (true);

-- Allow anyone to SELECT menu items
CREATE POLICY "Public can read menu_items"
  ON public.menu_items
  FOR SELECT
  USING (true);
