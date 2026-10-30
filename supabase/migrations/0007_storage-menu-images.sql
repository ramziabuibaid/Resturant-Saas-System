-- =============================================================================
-- Storage bucket policies for menu item images and restaurant logos
-- =============================================================================
-- 1. Create the bucket in Supabase Dashboard: Storage → New bucket → id: menu-images,
--    set Public to true, optional file size limit (e.g. 5MB).
-- 2. Run this SQL to add policies so the app can read and upload.
-- =============================================================================

-- Allow public read (so menu page can show images)
drop policy if exists "Public read menu-images" on storage.objects;
create policy "Public read menu-images"
on storage.objects for select
using (bucket_id = 'menu-images');

-- Allow upload: أي مستخدم مصادق عليه (صاحب مطعم أو super_admin) يمكنه الرفع إلى menu-images
drop policy if exists "Allow upload menu-images" on storage.objects;
create policy "Allow upload menu-images"
on storage.objects for insert
with check (
  bucket_id = 'menu-images'
  and auth.role() = 'authenticated'
);

-- Allow update (استبدال الشعار مثلاً)
drop policy if exists "Allow update menu-images" on storage.objects;
create policy "Allow update menu-images"
on storage.objects for update
using (bucket_id = 'menu-images' and auth.role() = 'authenticated');

-- Allow delete
drop policy if exists "Allow delete menu-images" on storage.objects;
create policy "Allow delete menu-images"
on storage.objects for delete
using (bucket_id = 'menu-images' and auth.role() = 'authenticated');
