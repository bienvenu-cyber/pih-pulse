-- Projet : localisation + rôles recherchés (create form → DB)
alter table public.projects
  add column if not exists location text default 'Parakou';

alter table public.projects
  add column if not exists roles_needed text[] default '{}';

comment on column public.projects.location is 'Lieu / remote du projet';
comment on column public.projects.roles_needed is 'Rôles recherchés (dev, design, …)';

notify pgrst, 'reload schema';
