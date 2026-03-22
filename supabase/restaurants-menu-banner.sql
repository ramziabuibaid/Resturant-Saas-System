-- بانر ترويجي (صورة أو فيديو) في صفحة المنيو العامة — يُرفع من لوحة التحكم
alter table public.restaurants
  add column if not exists menu_banner_url text,
  add column if not exists menu_banner_kind text check (
    menu_banner_kind is null or menu_banner_kind in ('image', 'video')
  ),
  add column if not exists menu_banner_caption text;

comment on column public.restaurants.menu_banner_url is 'رابط عام لصورة أو فيديو البانر الترويجي';
comment on column public.restaurants.menu_banner_kind is 'image | video حسب نوع الملف المرفوع';
comment on column public.restaurants.menu_banner_caption is 'نص اختياري يظهر تحت أو بجانب البانر';
