-- Coller dans SQL Editor si migration non appliquée
alter table public.projects
  add column if not exists location text default 'Parakou';
alter table public.projects
  add column if not exists roles_needed text[] default '{}';
notify pgrst, 'reload schema';
