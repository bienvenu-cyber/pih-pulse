-- Coller dans SQL Editor si migration non appliquée
alter table public.profiles
  add column if not exists available_for_missions boolean not null default true;
alter table public.profiles
  add column if not exists preferred_locale text not null default 'fr';
alter table public.profiles
  add column if not exists push_enabled boolean not null default true;
notify pgrst, 'reload schema';
