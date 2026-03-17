-- =============================================================================
-- RLS policies for admin: create / update / delete menu items
-- =============================================================================
-- Run this in the Supabase SQL Editor so /admin/items can add, edit, and delete
-- menu items. These allow the anon key to modify data; for production you may
-- want to restrict to authenticated users (e.g. USING (auth.role() = 'authenticated')).
-- =============================================================================

-- Menu items: allow insert, update, delete (for admin)
DROP POLICY IF EXISTS "Allow insert menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow update menu_items" ON public.menu_items;
DROP POLICY IF EXISTS "Allow delete menu_items" ON public.menu_items;

CREATE POLICY "Allow insert menu_items"
  ON public.menu_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update menu_items"
  ON public.menu_items FOR UPDATE USING (true);

CREATE POLICY "Allow delete menu_items"
  ON public.menu_items FOR DELETE USING (true);
