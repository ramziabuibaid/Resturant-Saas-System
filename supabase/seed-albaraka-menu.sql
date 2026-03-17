-- =============================================================================
-- منيو مطعم البركة (albaraka) — إدراج التصنيفات وعناصر المنيو من الصورة
-- =============================================================================
-- تشغيل بعد: menu-items-extended-columns.sql
-- الأسعار مخزنة بالسنت (مثلاً 25 ريال = 2500)
-- =============================================================================

do $$
declare
  r_id uuid;
  cat_grill uuid;
  cat_sandwich uuid;
  cat_appetizer uuid;
begin
  select id into r_id from restaurants where subdomain = 'albaraka' limit 1;
  if r_id is null then
    raise exception 'Restaurant albaraka not found. Create it first.';
  end if;

  -- التصنيفات (شغّل السكربت مرة واحدة؛ إن أعدت التشغيل احذف أصناف/تصنيفات البركة أولاً)
  insert into categories (restaurant_id, name)
  values (r_id, 'المشويات'), (r_id, 'السندوتشات'), (r_id, 'المقبلات');

  select id into cat_grill from categories where restaurant_id = r_id and name = 'المشويات' limit 1;
  select id into cat_sandwich from categories where restaurant_id = r_id and name = 'السندوتشات' limit 1;
  select id into cat_appetizer from categories where restaurant_id = r_id and name = 'المقبلات' limit 1;

  -- المشويات
  insert into menu_items (restaurant_id, category_id, name, description, price, price_options, calories, is_meal) values
  (r_id, cat_grill, 'كباب لحم', null, 2500, '[{"label":"نفر","price_cents":2500},{"label":"نصف كيلو","price_cents":5000},{"label":"كيلو","price_cents":10000}]'::jsonb, '1630 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'أوصال لحم', null, 3000, '[{"label":"نفر","price_cents":3000},{"label":"نصف كيلو","price_cents":6000},{"label":"كيلو","price_cents":12000}]'::jsonb, '735 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'ريش غنم', null, 3000, '[{"label":"نفر","price_cents":3000},{"label":"نصف كيلو","price_cents":6000},{"label":"كيلو","price_cents":12000}]'::jsonb, '900 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'كباب مبشور', null, 2500, '[{"label":"نفر","price_cents":2500},{"label":"نصف كيلو","price_cents":5000},{"label":"كيلو","price_cents":10000}]'::jsonb, '1950 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'كباب دجاج', null, 2000, '[{"label":"نفر","price_cents":2000},{"label":"نصف كيلو","price_cents":4000},{"label":"كيلو","price_cents":8000}]'::jsonb, '1650 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'شيش طاووق', null, 2000, '[{"label":"نفر","price_cents":2000},{"label":"نصف كيلو","price_cents":4000},{"label":"كيلو","price_cents":8000}]'::jsonb, '885 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'كبة عالسيخ', null, 2500, '[{"label":"نفر","price_cents":2500},{"label":"نصف كيلو","price_cents":5000},{"label":"كيلو","price_cents":10000}]'::jsonb, '650 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'مشكل لحم', null, 2800, '[{"label":"نفر","price_cents":2800},{"label":"نصف كيلو","price_cents":5500},{"label":"كيلو","price_cents":11000}]'::jsonb, '1130 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'مشكل دجاج', null, 2000, '[{"label":"نفر","price_cents":2000},{"label":"نصف كيلو","price_cents":4000},{"label":"كيلو","price_cents":8000}]'::jsonb, '1250 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'مشكل لحم ودجاج', null, 2400, '[{"label":"نفر","price_cents":2400},{"label":"نصف كيلو","price_cents":4800},{"label":"كيلو","price_cents":9500}]'::jsonb, '1190 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'كبدة غنم', null, 2000, '[{"label":"نفر","price_cents":2000},{"label":"نصف كيلو","price_cents":4000},{"label":"كيلو","price_cents":8000}]'::jsonb, '430 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'سجق لحم غنم', null, 2300, '[{"label":"نفر","price_cents":2300},{"label":"نصف كيلو","price_cents":4500},{"label":"كيلو","price_cents":9000}]'::jsonb, '560 سعرة لكل 250 غرام', true),
  (r_id, cat_grill, 'كبة مشوية لحم', null, 600, '[{"label":"الحبة","price_cents":600}]'::jsonb, '660 سعرة لكل 250 غرام', true);

  -- السندوتشات
  insert into menu_items (restaurant_id, category_id, name, description, price, price_options, calories, is_meal) values
  (r_id, cat_sandwich, 'كباب لحم', null, 700, null, '350 سعرة حرارية', true),
  (r_id, cat_sandwich, 'أوصال لحم', null, 1100, null, '385 سعرة حرارية', true),
  (r_id, cat_sandwich, 'كباب دجاج', null, 600, null, '360 سعرة حرارية', true),
  (r_id, cat_sandwich, 'شيش طاووق', null, 700, null, '365 سعرة حرارية', true),
  (r_id, cat_sandwich, 'عرايس لحم', null, 1000, null, '470 سعرة حرارية', true);

  -- المقبلات
  insert into menu_items (restaurant_id, category_id, name, description, price, price_options, calories, is_meal) values
  (r_id, cat_appetizer, 'حمص', null, 500, '[{"label":"صغير","price_cents":500},{"label":"وسط","price_cents":1000},{"label":"كبير","price_cents":2500}]'::jsonb, '650 سعرة حرارية', false),
  (r_id, cat_appetizer, 'متبل', null, 500, '[{"label":"صغير","price_cents":500},{"label":"وسط","price_cents":1000},{"label":"كبير","price_cents":2500}]'::jsonb, '590 سعرة حرارية', false),
  (r_id, cat_appetizer, 'بابا غنوج', null, 500, '[{"label":"صغير","price_cents":500},{"label":"وسط","price_cents":1000},{"label":"كبير","price_cents":2500}]'::jsonb, '360 سعرة حرارية', false),
  (r_id, cat_appetizer, 'تبولة', null, 500, '[{"label":"صغير","price_cents":500},{"label":"وسط","price_cents":1000},{"label":"كبير","price_cents":2500}]'::jsonb, '340 سعرة حرارية', false),
  (r_id, cat_appetizer, 'فتوش', null, 500, '[{"label":"صغير","price_cents":500},{"label":"وسط","price_cents":1000},{"label":"كبير","price_cents":2500}]'::jsonb, '370 سعرة حرارية', false),
  (r_id, cat_appetizer, 'سلطة خضار', null, 500, '[{"label":"صغير","price_cents":500},{"label":"وسط","price_cents":1000},{"label":"كبير","price_cents":2500}]'::jsonb, '120 سعرة حرارية', false),
  (r_id, cat_appetizer, 'مقبلات مشكلة', null, 1500, '[{"label":"وسط","price_cents":1500},{"label":"كبير","price_cents":2500}]'::jsonb, '601 سعرة حرارية', false),
  (r_id, cat_appetizer, 'محمرة', null, 500, null, '640 سعرة حرارية', false),
  (r_id, cat_appetizer, 'سلطة حارة', null, 500, null, '230 سعرة حرارية', false),
  (r_id, cat_appetizer, 'طحينة', null, 400, null, '155 سعرة حرارية', false),
  (r_id, cat_appetizer, 'كبة مقلية لحم', null, 400, '[{"label":"الحبة","price_cents":400}]'::jsonb, '228 سعرة حرارية', false);

end $$;
