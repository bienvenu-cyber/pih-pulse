-- Phone number for profile contact
alter table public.profiles
  add column if not exists phone text;
