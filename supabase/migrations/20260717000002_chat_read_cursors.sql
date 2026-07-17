-- ============================================================
-- S1 — Read model chat projet (curseurs par user × projet)
-- Remplace le is_read partagé (cassé multi-membres).
-- DM : is_read sur messages reste OK (1 destinataire).
-- ============================================================

create table if not exists public.chat_read_cursors (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, project_id)
);

create index if not exists idx_chat_read_cursors_project
  on public.chat_read_cursors (project_id);

alter table public.chat_read_cursors enable row level security;

drop policy if exists "chat_read_cursors_select_own" on public.chat_read_cursors;
create policy "chat_read_cursors_select_own"
  on public.chat_read_cursors for select
  using (auth.uid() = user_id);

drop policy if exists "chat_read_cursors_upsert_own" on public.chat_read_cursors;
create policy "chat_read_cursors_insert_own"
  on public.chat_read_cursors for insert
  with check (auth.uid() = user_id);

drop policy if exists "chat_read_cursors_update_own" on public.chat_read_cursors;
create policy "chat_read_cursors_update_own"
  on public.chat_read_cursors for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

/**
 * Marque le chat projet comme lu jusqu’à now() pour l’appelant.
 */
create or replace function public.mark_project_chat_read(p_project_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ts timestamptz := timezone('utc'::text, now());
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_project_id is null then
    raise exception 'invalid_project';
  end if;

  -- Doit être membre (ou créateur)
  if not exists (
    select 1 from public.project_members
    where project_id = p_project_id and user_id = v_uid
  ) and not exists (
    select 1 from public.projects
    where id = p_project_id and creator_id = v_uid
  ) then
    raise exception 'not_a_member';
  end if;

  insert into public.chat_read_cursors (user_id, project_id, last_read_at, updated_at)
  values (v_uid, p_project_id, v_ts, v_ts)
  on conflict (user_id, project_id) do update
    set last_read_at = excluded.last_read_at,
        updated_at = excluded.updated_at;

  return v_ts;
end;
$$;

revoke all on function public.mark_project_chat_read(uuid) from public;
grant execute on function public.mark_project_chat_read(uuid) to authenticated;

/**
 * Compte non-lus projet pour l’utilisateur courant (tous ses projets).
 * Messages d’autrui avec created_at > last_read_at (ou epoch si pas de curseur).
 */
create or replace function public.count_my_project_chat_unread()
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
begin
  if v_uid is null then
    return 0;
  end if;

  select count(*)::integer into v_count
  from public.messages m
  join public.project_members pm
    on pm.project_id = m.project_id and pm.user_id = v_uid
  left join public.chat_read_cursors c
    on c.project_id = m.project_id and c.user_id = v_uid
  where m.project_id is not null
    and m.sender_id <> v_uid
    and m.created_at > coalesce(c.last_read_at, '1970-01-01'::timestamptz);

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.count_my_project_chat_unread() from public;
grant execute on function public.count_my_project_chat_unread() to authenticated;

/**
 * Non-lus pour une liste de projets (inbox).
 * Retourne table (project_id, unread_count).
 */
create or replace function public.count_project_chat_unread_batch(p_project_ids uuid[])
returns table (project_id uuid, unread_count integer)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_project_ids is null or array_length(p_project_ids, 1) is null then
    return;
  end if;

  return query
  select
    m.project_id,
    count(*)::integer as unread_count
  from public.messages m
  left join public.chat_read_cursors c
    on c.project_id = m.project_id and c.user_id = v_uid
  where m.project_id = any (p_project_ids)
    and m.sender_id <> v_uid
    and m.created_at > coalesce(c.last_read_at, '1970-01-01'::timestamptz)
  group by m.project_id;
end;
$$;

revoke all on function public.count_project_chat_unread_batch(uuid[]) from public;
grant execute on function public.count_project_chat_unread_batch(uuid[]) to authenticated;

notify pgrst, 'reload schema';
