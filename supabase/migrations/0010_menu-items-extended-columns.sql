-- =============================================================================
-- أعمدة إضافية لجدول menu_items لدعم أحجام متعددة، السعرات، وتمييز الوجبة
-- =============================================================================
-- price_options: خيارات أسعار حسب الحجم (عند وجودها تُعرض بدل السعر الواحد)
--   مثال: [{"label":"نفر","price_cents":2500},{"label":"نصف كيلو","price_cents":5000},{"label":"كيلو","price_cents":10000}]
-- calories: نص يصف السعرات الحرارية (مثل "1630 سعرة لكل 250 غرام")
-- is_meal: true = وجبة رئيسية، false = مقبلات/إضافة
-- =============================================================================

alter table public.menu_items
  add column if not exists price_options jsonb,
  add column if not exists calories text,
  add column if not exists is_meal boolean default true;

comment on column public.menu_items.price_options is 'Optional array of {label, price_cents} for size/price variants';
comment on column public.menu_items.calories is 'Caloric info text e.g. 1630 سعرة لكل 250 غرام';
comment on column public.menu_items.is_meal is 'true = main dish, false = side/appetizer';
