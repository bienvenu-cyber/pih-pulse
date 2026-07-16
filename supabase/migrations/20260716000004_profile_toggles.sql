-- Toggles profil : présence, rappels + last_seen pour online
alter table public.profiles
  add column if not exists show_online_presence boolean not null default true;

alter table public.profiles
  add column if not exists reminders_enabled boolean not null default true;

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

comment on column public.profiles.show_online_presence is 'Afficher « en ligne » aux autres';
comment on column public.profiles.reminders_enabled is 'Rappels missions / deadlines';
comment on column public.profiles.last_seen_at is 'Dernière activité app (présence)';

notify pgrst, 'reload schema';
