-- Profil : dispo missions, langue, push opt-in
alter table public.profiles
  add column if not exists available_for_missions boolean not null default true;

alter table public.profiles
  add column if not exists preferred_locale text not null default 'fr';

alter table public.profiles
  add column if not exists push_enabled boolean not null default true;

comment on column public.profiles.available_for_missions is 'Statut dispo pour missions (vitrine hub)';
comment on column public.profiles.preferred_locale is 'fr | en — préférence UI';
comment on column public.profiles.push_enabled is 'Opt-in notifications push';

notify pgrst, 'reload schema';
