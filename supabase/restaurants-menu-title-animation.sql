-- تأثير اختياري لاسم المطعم في المنيو العام (وميض + توهج)
-- شغّل هذا السكربت في مشروع Supabase.

alter table public.restaurants
  add column if not exists menu_title_animation_enabled boolean not null default false;

comment on column public.restaurants.menu_title_animation_enabled is
  'عند true: تأثير لون وتوهج ووميض قصير لاسم المطعم في صفحة المنيو العامة.';
