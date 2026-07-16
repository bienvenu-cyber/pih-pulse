alter table public.profiles
  add column if not exists show_online_presence boolean not null default true;
alter table public.profiles
  add column if not exists reminders_enabled boolean not null default true;
alter table public.profiles
  add column if not exists last_seen_at timestamptz;
notify pgrst, 'reload schema';
