-- أسعار العملة الثانية على مستوى الصنف
alter table public.menu_items
  add column if not exists secondary_price integer,
  add column if not exists secondary_price_options jsonb;

comment on column public.menu_items.secondary_price is
  'Secondary currency price in cents for single-price items.';

comment on column public.menu_items.secondary_price_options is
  'Optional secondary-currency array of {label, price_cents} matching price_options.';
