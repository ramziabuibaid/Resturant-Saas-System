-- عملة عرض الأسعار في منيو المطعم (رمز ISO 4217)
alter table public.restaurants
  add column if not exists currency_code text default 'SAR';

comment on column public.restaurants.currency_code is 'ISO 4217 currency code for menu prices (e.g. SAR, ILS, JOD)';
