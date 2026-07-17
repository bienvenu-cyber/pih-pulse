-- Coller dans SQL Editor — S1 chat read cursors + engagement_counts
-- (contenu aligné migrations 20260717000002 + 000003)

-- ─── chat_read_cursors ──────────────────────────────────────
create table if not exists public.chat_read_cursors (
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  last_read_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (user_id, project_id)
);
create index if not exists idx_chat_read_cursors_project on public.chat_read_cursors (project_id);
alter table public.chat_read_cursors enable row level security;
drop policy if exists "chat_read_cursors_select_own" on public.chat_read_cursors;
create policy "chat_read_cursors_select_own" on public.chat_read_cursors for select using (auth.uid() = user_id);
drop policy if exists "chat_read_cursors_insert_own" on public.chat_read_cursors;
create policy "chat_read_cursors_insert_own" on public.chat_read_cursors for insert with check (auth.uid() = user_id);
drop policy if exists "chat_read_cursors_update_own" on public.chat_read_cursors;
create policy "chat_read_cursors_update_own" on public.chat_read_cursors for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.mark_project_chat_read(p_project_id uuid)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_ts timestamptz := timezone('utc'::text, now());
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_project_id is null then raise exception 'invalid_project'; end if;
  if not exists (select 1 from public.project_members where project_id = p_project_id and user_id = v_uid)
     and not exists (select 1 from public.projects where id = p_project_id and creator_id = v_uid) then
    raise exception 'not_a_member';
  end if;
  insert into public.chat_read_cursors (user_id, project_id, last_read_at, updated_at)
  values (v_uid, p_project_id, v_ts, v_ts)
  on conflict (user_id, project_id) do update
    set last_read_at = excluded.last_read_at, updated_at = excluded.updated_at;
  return v_ts;
end; $$;
grant execute on function public.mark_project_chat_read(uuid) to authenticated;

create or replace function public.count_my_project_chat_unread()
returns integer language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid(); v_count integer;
begin
  if v_uid is null then return 0; end if;
  select count(*)::integer into v_count
  from public.messages m
  join public.project_members pm on pm.project_id = m.project_id and pm.user_id = v_uid
  left join public.chat_read_cursors c on c.project_id = m.project_id and c.user_id = v_uid
  where m.project_id is not null and m.sender_id <> v_uid
    and m.created_at > coalesce(c.last_read_at, '1970-01-01'::timestamptz);
  return coalesce(v_count, 0);
end; $$;
grant execute on function public.count_my_project_chat_unread() to authenticated;

create or replace function public.count_project_chat_unread_batch(p_project_ids uuid[])
returns table (project_id uuid, unread_count integer)
language plpgsql security definer set search_path = public stable as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null or p_project_ids is null or array_length(p_project_ids, 1) is null then return; end if;
  return query
  select m.project_id, count(*)::integer
  from public.messages m
  left join public.chat_read_cursors c on c.project_id = m.project_id and c.user_id = v_uid
  where m.project_id = any (p_project_ids) and m.sender_id <> v_uid
    and m.created_at > coalesce(c.last_read_at, '1970-01-01'::timestamptz)
  group by m.project_id;
end; $$;
grant execute on function public.count_project_chat_unread_batch(uuid[]) to authenticated;

-- ─── engagement_counts ────────────────────────────────────
create table if not exists public.engagement_counts (
  ref_type text not null check (ref_type in ('project', 'mission', 'post')),
  ref_id uuid not null,
  reaction_hot integer not null default 0,
  reaction_idea integer not null default 0,
  reaction_ship integer not null default 0,
  reaction_contribute integer not null default 0,
  boosts integer not null default 0,
  updated_at timestamptz not null default timezone('utc'::text, now()),
  primary key (ref_type, ref_id)
);
create index if not exists idx_engagement_counts_ref on public.engagement_counts (ref_id, ref_type);
alter table public.engagement_counts enable row level security;
drop policy if exists "engagement_counts_select_public" on public.engagement_counts;
create policy "engagement_counts_select_public" on public.engagement_counts for select using (true);

create or replace function public.ensure_engagement_row(p_ref_type text, p_ref_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.engagement_counts (ref_type, ref_id) values (p_ref_type, p_ref_id)
  on conflict (ref_type, ref_id) do nothing;
end; $$;

create or replace function public.tg_reactions_engagement()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_col text; v_type text; v_ref_type text; v_ref_id uuid; v_delta integer;
begin
  if tg_op = 'INSERT' then v_type := new.type; v_ref_type := new.ref_type; v_ref_id := new.ref_id; v_delta := 1;
  elsif tg_op = 'DELETE' then v_type := old.type; v_ref_type := old.ref_type; v_ref_id := old.ref_id; v_delta := -1;
  else return null; end if;
  v_col := case v_type when 'hot' then 'reaction_hot' when 'idea' then 'reaction_idea'
    when 'ship' then 'reaction_ship' when 'contribute' then 'reaction_contribute' else null end;
  if v_col is null then return null; end if;
  perform public.ensure_engagement_row(v_ref_type, v_ref_id);
  execute format(
    'update public.engagement_counts set %I = greatest(0, %I + $1), updated_at = timezone(''utc''::text, now()) where ref_type = $2 and ref_id = $3',
    v_col, v_col) using v_delta, v_ref_type, v_ref_id;
  return null;
end; $$;
drop trigger if exists trg_reactions_engagement on public.reactions;
create trigger trg_reactions_engagement after insert or delete on public.reactions
  for each row execute function public.tg_reactions_engagement();

create or replace function public.tg_boosts_engagement()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_ref_type text; v_ref_id uuid; v_delta integer;
begin
  if tg_op = 'INSERT' then v_ref_type := new.ref_type; v_ref_id := new.ref_id; v_delta := 1;
  elsif tg_op = 'DELETE' then v_ref_type := old.ref_type; v_ref_id := old.ref_id; v_delta := -1;
  else return null; end if;
  perform public.ensure_engagement_row(v_ref_type, v_ref_id);
  update public.engagement_counts set boosts = greatest(0, boosts + v_delta),
    updated_at = timezone('utc'::text, now()) where ref_type = v_ref_type and ref_id = v_ref_id;
  return null;
end; $$;
drop trigger if exists trg_boosts_engagement on public.boosts;
create trigger trg_boosts_engagement after insert or delete on public.boosts
  for each row execute function public.tg_boosts_engagement();

insert into public.engagement_counts (ref_type, ref_id, reaction_hot, reaction_idea, reaction_ship, reaction_contribute, boosts)
select r.ref_type, r.ref_id,
  count(*) filter (where r.type = 'hot')::integer,
  count(*) filter (where r.type = 'idea')::integer,
  count(*) filter (where r.type = 'ship')::integer,
  count(*) filter (where r.type = 'contribute')::integer, 0
from public.reactions r group by r.ref_type, r.ref_id
on conflict (ref_type, ref_id) do update set
  reaction_hot = excluded.reaction_hot, reaction_idea = excluded.reaction_idea,
  reaction_ship = excluded.reaction_ship, reaction_contribute = excluded.reaction_contribute,
  updated_at = timezone('utc'::text, now());

insert into public.engagement_counts (ref_type, ref_id, boosts)
select b.ref_type, b.ref_id, count(*)::integer from public.boosts b group by b.ref_type, b.ref_id
on conflict (ref_type, ref_id) do update set boosts = excluded.boosts, updated_at = timezone('utc'::text, now());

-- ─── retention S2 ─────────────────────────────────────────
create or replace function public.purge_retention(
  p_notif_read_days integer default 90,
  p_notif_unread_days integer default 180,
  p_idempotency_days integer default 90
) returns jsonb language plpgsql security definer set search_path = public as $$
declare v_read integer := 0; v_unread integer := 0; v_idem integer := 0;
begin
  if p_notif_read_days < 7 or p_notif_unread_days < 30 then raise exception 'retention_too_aggressive'; end if;
  delete from public.activity_notifications where is_read = true
    and created_at < timezone('utc'::text, now()) - (p_notif_read_days || ' days')::interval;
  get diagnostics v_read = row_count;
  delete from public.activity_notifications where is_read = false
    and created_at < timezone('utc'::text, now()) - (p_notif_unread_days || ' days')::interval;
  get diagnostics v_unread = row_count;
  if to_regclass('public.reputation_idempotency') is not null then
    delete from public.reputation_idempotency
    where created_at < timezone('utc'::text, now()) - (p_idempotency_days || ' days')::interval;
    get diagnostics v_idem = row_count;
  end if;
  return jsonb_build_object('deleted_read_notifs', v_read, 'deleted_unread_notifs', v_unread,
    'deleted_idempotency', v_idem, 'ran_at', timezone('utc'::text, now()));
end; $$;
grant execute on function public.purge_retention(integer, integer, integer) to service_role;

notify pgrst, 'reload schema';
