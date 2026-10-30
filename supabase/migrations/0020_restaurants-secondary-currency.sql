-- دعم العملة الثانية في إعدادات المطعم
alter table public.restaurants
  add column if not exists secondary_currency_enabled boolean default false,
  add column if not exists secondary_currency_code text,
  add column if not exists secondary_currency_exchange_rate numeric;

comment on column public.restaurants.secondary_currency_enabled is
  'When true, menu displays a secondary currency price under the primary price.';

comment on column public.restaurants.secondary_currency_code is
  'ISO 4217 secondary currency code used for dual-price display (e.g. USD, EUR).';

comment on column public.restaurants.secondary_currency_exchange_rate is
  'Secondary currency units per 1 primary currency unit (e.g. 3.7 means 1 primary = 3.7 secondary).';
