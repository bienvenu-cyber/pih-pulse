-- ============================================================
-- Hub posts (feed posts indépendants des projets)
-- Idempotent : safe à rejouer dans le SQL Editor Supabase
-- ============================================================

-- 1) Table posts (priorité — le reste peut échouer sans bloquer si séparé)
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  body text not null,
  media jsonb not null default '[]'::jsonb,
  project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz
);

create index if not exists idx_posts_created on public.posts (created_at desc);
create index if not exists idx_posts_author on public.posts (author_id);

alter table public.posts enable row level security;

drop policy if exists "Posts are public." on public.posts;
create policy "Posts are public." on public.posts
  for select using (true);

drop policy if exists "Authors can insert posts." on public.posts;
create policy "Authors can insert posts." on public.posts
  for insert with check (auth.role() = 'authenticated' and auth.uid() = author_id);

drop policy if exists "Authors can update own posts." on public.posts;
create policy "Authors can update own posts." on public.posts
  for update using (auth.uid() = author_id);

drop policy if exists "Authors can delete own posts." on public.posts;
create policy "Authors can delete own posts." on public.posts
  for delete using (auth.uid() = author_id);

-- 2) Autoriser ref_type = 'post' sur reactions / boosts / reaction_awards
--    (uniquement si les tables existent — évite un rollback complet)

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'reaction_awards'
  ) then
    alter table public.reaction_awards drop constraint if exists reaction_awards_ref_type_check;
    alter table public.reaction_awards
      add constraint reaction_awards_ref_type_check
      check (ref_type in ('project', 'mission', 'post'));
  end if;
exception when others then
  raise notice 'reaction_awards ref_type check skipped: %', sqlerrm;
end $$;

do $$
declare
  cname text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'reactions'
  ) then
    return;
  end if;

  -- Drop any CHECK constraint on reactions.ref_type (names vary)
  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'reactions'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%ref_type%'
  loop
    execute format('alter table public.reactions drop constraint if exists %I', cname);
  end loop;

  alter table public.reactions
    add constraint reactions_ref_type_check
    check (ref_type in ('project', 'mission', 'post'));
exception when others then
  raise notice 'reactions ref_type check skipped: %', sqlerrm;
end $$;

do $$
declare
  cname text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'boosts'
  ) then
    return;
  end if;

  for cname in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'boosts'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%ref_type%'
  loop
    execute format('alter table public.boosts drop constraint if exists %I', cname);
  end loop;

  alter table public.boosts
    add constraint boosts_ref_type_check
    check (ref_type in ('project', 'mission', 'post'));
exception when others then
  raise notice 'boosts ref_type check skipped: %', sqlerrm;
end $$;

-- 3) Reload PostgREST schema cache (Supabase)
notify pgrst, 'reload schema';
