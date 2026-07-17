-- ============================================================
-- S3 Scale hardening — cron, archive messages, hub_feed,
-- award_points renforcé, bulk-ready, RLS messages optimisée
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1) Cron purge_retention (si pg_cron dispo)
-- ────────────────────────────────────────────────────────────
do $$
begin
  create extension if not exists pg_cron with schema pg_catalog;
exception when others then
  raise notice 'pg_cron not available: %', sqlerrm;
end $$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'pih-purge-retention';
    perform cron.schedule(
      'pih-purge-retention',
      '0 3 * * 0',
      $cron$select public.purge_retention(90, 180, 90);$cron$
    );
  end if;
exception when others then
  raise notice 'cron schedule skipped: %', sqlerrm;
end $$;

-- ────────────────────────────────────────────────────────────
-- 2) Helper RLS membership (perf) — AVANT policies archive/messages
-- ────────────────────────────────────────────────────────────
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    p_project_id is not null
    and (
      exists (
        select 1 from public.project_members pm
        where pm.project_id = p_project_id and pm.user_id = auth.uid()
      )
      or exists (
        select 1 from public.projects p
        where p.id = p_project_id and p.creator_id = auth.uid()
      )
    );
$$;

revoke all on function public.is_project_member(uuid) from public;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.is_project_member(uuid) to anon;

-- ────────────────────────────────────────────────────────────
-- 3) Archive messages (threads longs)
-- ────────────────────────────────────────────────────────────
create table if not exists public.messages_archive (
  id uuid primary key,
  sender_id uuid,
  receiver_id uuid,
  project_id uuid,
  text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null,
  archived_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_messages_archive_project_created
  on public.messages_archive (project_id, created_at desc)
  where project_id is not null;

create index if not exists idx_messages_archive_dm
  on public.messages_archive (receiver_id, created_at desc)
  where project_id is null;

alter table public.messages_archive enable row level security;

drop policy if exists "messages_archive_select" on public.messages_archive;
create policy "messages_archive_select" on public.messages_archive
  for select using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or (
      project_id is not null
      and public.is_project_member(project_id)
    )
  );

/**
 * Archive les messages plus vieux que N jours (défaut 365).
 * Garde les 100 plus récents par thread projet (sécurité UX).
 * service_role / SQL Editor.
 */
create or replace function public.archive_old_messages(
  p_days integer default 365,
  p_keep_recent_per_project integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cut timestamptz;
  v_moved integer := 0;
begin
  if p_days < 90 then
    raise exception 'archive_too_aggressive';
  end if;
  v_cut := timezone('utc'::text, now()) - (p_days || ' days')::interval;

  -- Messages projet hors fenêtre + hors "keep recent"
  with ranked as (
    select m.id,
      row_number() over (partition by m.project_id order by m.created_at desc) as rn
    from public.messages m
    where m.project_id is not null
  ),
  to_arch as (
    select m.*
    from public.messages m
    join ranked r on r.id = m.id
    where m.created_at < v_cut
      and r.rn > p_keep_recent_per_project
  ),
  ins as (
    insert into public.messages_archive (
      id, sender_id, receiver_id, project_id, text, is_read, created_at
    )
    select id, sender_id, receiver_id, project_id, text, is_read, created_at
    from to_arch
    on conflict (id) do nothing
    returning id
  ),
  del as (
    delete from public.messages m
    using ins
    where m.id = ins.id
    returning m.id
  )
  select count(*)::integer into v_moved from del;

  -- DM anciens (garde 200 derniers par paire approx via cut date only)
  with to_arch_dm as (
    select m.*
    from public.messages m
    where m.project_id is null
      and m.created_at < v_cut
  ),
  ins2 as (
    insert into public.messages_archive (
      id, sender_id, receiver_id, project_id, text, is_read, created_at
    )
    select id, sender_id, receiver_id, project_id, text, is_read, created_at
    from to_arch_dm
    on conflict (id) do nothing
    returning id
  ),
  del2 as (
    delete from public.messages m
    using ins2
    where m.id = ins2.id
    returning m.id
  )
  select v_moved + count(*)::integer into v_moved from del2;

  return jsonb_build_object(
    'archived', v_moved,
    'cutoff', v_cut,
    'ran_at', timezone('utc'::text, now())
  );
end;
$$;

revoke all on function public.archive_old_messages(integer, integer) from public;
grant execute on function public.archive_old_messages(integer, integer) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'pih-archive-messages';
    perform cron.schedule(
      'pih-archive-messages',
      '30 3 * * 0',
      $cron$select public.archive_old_messages(365, 100);$cron$
    );
  end if;
exception when others then
  raise notice 'archive cron skipped: %', sqlerrm;
end $$;

-- Policies messages plus légères
drop policy if exists "Users can see direct or project messages." on public.messages;
create policy "Users can see direct or project messages." on public.messages
  for select using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or (project_id is not null and public.is_project_member(project_id))
  );

drop policy if exists "Users can post direct or project messages." on public.messages;
create policy "Users can post direct or project messages." on public.messages
  for insert with check (
    auth.role() = 'authenticated'
    and auth.uid() = sender_id
    and (
      project_id is null
      or public.is_project_member(project_id)
    )
  );

-- ────────────────────────────────────────────────────────────
-- 4) hub_feed unifié (ranking global boost + date)
-- ────────────────────────────────────────────────────────────
create table if not exists public.hub_feed (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('post', 'project', 'mission', 'event')),
  item_id uuid not null,
  author_id uuid references public.profiles(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null default '',
  body text,
  status text,
  skills text[] default '{}',
  media jsonb default '[]'::jsonb,
  boost_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (item_type, item_id)
);

create index if not exists idx_hub_feed_rank
  on public.hub_feed (boost_count desc, created_at desc);

create index if not exists idx_hub_feed_created
  on public.hub_feed (created_at desc);

create index if not exists idx_hub_feed_author
  on public.hub_feed (author_id, created_at desc);

create index if not exists idx_hub_feed_project
  on public.hub_feed (project_id)
  where project_id is not null;

alter table public.hub_feed enable row level security;
drop policy if exists "hub_feed_select_public" on public.hub_feed;
create policy "hub_feed_select_public" on public.hub_feed
  for select using (true);
-- writes via triggers only

create or replace function public.hub_feed_upsert(
  p_type text,
  p_item_id uuid,
  p_author_id uuid,
  p_project_id uuid,
  p_title text,
  p_body text,
  p_status text,
  p_skills text[],
  p_media jsonb,
  p_created_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_boost integer := 0;
begin
  select coalesce(ec.boosts, 0) into v_boost
  from public.engagement_counts ec
  where ec.ref_type = p_type and ec.ref_id = p_item_id;

  insert into public.hub_feed (
    item_type, item_id, author_id, project_id, title, body, status, skills, media,
    boost_count, created_at, updated_at
  ) values (
    p_type, p_item_id, p_author_id, p_project_id,
    coalesce(nullif(trim(p_title), ''), 'Sans titre'),
    p_body, p_status, coalesce(p_skills, '{}'), coalesce(p_media, '[]'::jsonb),
    coalesce(v_boost, 0), coalesce(p_created_at, now()), now()
  )
  on conflict (item_type, item_id) do update set
    author_id = excluded.author_id,
    project_id = excluded.project_id,
    title = excluded.title,
    body = excluded.body,
    status = excluded.status,
    skills = excluded.skills,
    media = excluded.media,
    boost_count = excluded.boost_count,
    updated_at = now();
end;
$$;

-- Sync posts
create or replace function public.tg_hub_feed_posts()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.hub_feed where item_type = 'post' and item_id = old.id;
    return old;
  end if;
  perform public.hub_feed_upsert(
    'post', new.id, new.author_id, new.project_id,
    left(coalesce(new.body, new.title, ''), 160),
    new.body, null, '{}', coalesce(new.media, '[]'::jsonb), new.created_at
  );
  return new;
end;
$$;
drop trigger if exists trg_hub_feed_posts on public.posts;
create trigger trg_hub_feed_posts
  after insert or update or delete on public.posts
  for each row execute function public.tg_hub_feed_posts();

-- Sync projects
create or replace function public.tg_hub_feed_projects()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.hub_feed where item_type = 'project' and item_id = old.id;
    return old;
  end if;
  perform public.hub_feed_upsert(
    'project', new.id, new.creator_id, new.id,
    new.name, new.short_description, new.status,
    coalesce(new.skills_needed, '{}'),
    case
      when (to_jsonb(new) ? 'media') and new.media is not null then new.media
      when new.avatar_url is not null then
        jsonb_build_array(jsonb_build_object('type','image','url',new.avatar_url))
      else '[]'::jsonb
    end,
    new.created_at
  );
  return new;
end;
$$;
drop trigger if exists trg_hub_feed_projects on public.projects;
create trigger trg_hub_feed_projects
  after insert or update or delete on public.projects
  for each row execute function public.tg_hub_feed_projects();

-- Sync missions (skip cancelled in feed via status field; client filters)
create or replace function public.tg_hub_feed_missions()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.hub_feed where item_type = 'mission' and item_id = old.id;
    return old;
  end if;
  if new.status = 'cancelled' then
    delete from public.hub_feed where item_type = 'mission' and item_id = new.id;
    return new;
  end if;
  perform public.hub_feed_upsert(
    'mission', new.id,
    (select creator_id from public.projects where id = new.project_id),
    new.project_id,
    new.title,
    null,
    new.status,
    coalesce(new.skills_required, '{}'),
    coalesce(new.media, '[]'::jsonb),
    new.created_at
  );
  return new;
end;
$$;
drop trigger if exists trg_hub_feed_missions on public.missions;
create trigger trg_hub_feed_missions
  after insert or update or delete on public.missions
  for each row execute function public.tg_hub_feed_missions();

-- Sync events
create or replace function public.tg_hub_feed_events()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    delete from public.hub_feed where item_type = 'event' and item_id = old.id;
    return old;
  end if;
  perform public.hub_feed_upsert(
    'event', new.id, new.created_by, null,
    new.title, new.description, null, '{}', '[]'::jsonb,
    coalesce(new.created_at, new.starts_at, now())
  );
  return new;
end;
$$;
drop trigger if exists trg_hub_feed_events on public.hub_events;
create trigger trg_hub_feed_events
  after insert or update or delete on public.hub_events
  for each row execute function public.tg_hub_feed_events();

-- Boost count sync into hub_feed
create or replace function public.tg_hub_feed_boost_sync()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type text;
  v_id uuid;
  v_boosts integer;
begin
  if tg_op = 'DELETE' then
    v_type := old.ref_type;
    v_id := old.ref_id;
  else
    v_type := new.ref_type;
    v_id := new.ref_id;
  end if;
  select coalesce(boosts, 0) into v_boosts
  from public.engagement_counts
  where ref_type = v_type and ref_id = v_id;
  update public.hub_feed
  set boost_count = coalesce(v_boosts, 0), updated_at = now()
  where item_type = v_type and item_id = v_id;
  return null;
end;
$$;
-- Fire after engagement_counts updates via boost trigger — also hook boosts table
drop trigger if exists trg_hub_feed_boosts on public.boosts;
create trigger trg_hub_feed_boosts
  after insert or delete on public.boosts
  for each row execute function public.tg_hub_feed_boost_sync();

-- Backfill hub_feed
insert into public.hub_feed (item_type, item_id, author_id, project_id, title, body, status, skills, media, boost_count, created_at)
select 'post', p.id, p.author_id, p.project_id,
  left(coalesce(p.body, p.title, ''), 160), p.body, null, '{}', coalesce(p.media, '[]'::jsonb),
  coalesce(ec.boosts, 0), p.created_at
from public.posts p
left join public.engagement_counts ec on ec.ref_type = 'post' and ec.ref_id = p.id
on conflict (item_type, item_id) do nothing;

insert into public.hub_feed (item_type, item_id, author_id, project_id, title, body, status, skills, media, boost_count, created_at)
select 'project', pr.id, pr.creator_id, pr.id, pr.name, pr.short_description, pr.status,
  coalesce(pr.skills_needed, '{}'),
  '[]'::jsonb,
  coalesce(ec.boosts, 0), pr.created_at
from public.projects pr
left join public.engagement_counts ec on ec.ref_type = 'project' and ec.ref_id = pr.id
on conflict (item_type, item_id) do nothing;

insert into public.hub_feed (item_type, item_id, author_id, project_id, title, body, status, skills, media, boost_count, created_at)
select 'mission', m.id, pr.creator_id, m.project_id, m.title, null, m.status,
  coalesce(m.skills_required, '{}'), '[]'::jsonb,
  coalesce(ec.boosts, 0), m.created_at
from public.missions m
join public.projects pr on pr.id = m.project_id
left join public.engagement_counts ec on ec.ref_type = 'mission' and ec.ref_id = m.id
where m.status is distinct from 'cancelled'
on conflict (item_type, item_id) do nothing;

insert into public.hub_feed (item_type, item_id, author_id, project_id, title, body, status, skills, media, boost_count, created_at)
select 'event', e.id, e.created_by, null, e.title, e.description, null, '{}', '[]'::jsonb, 0,
  coalesce(e.created_at, e.starts_at, now())
from public.hub_events e
on conflict (item_type, item_id) do nothing;

-- ────────────────────────────────────────────────────────────
-- 5) award_points renforcé (whitelist clés + targets)
-- ────────────────────────────────────────────────────────────
create or replace function public.award_points(
  p_user_id uuid,
  p_points integer,
  p_reason text,
  p_idempotency_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_id uuid;
  v_reason text;
  v_hour_count integer;
  v_day_points integer;
  v_key text;
  v_prefix text;
  v_allow_other boolean := false;
  v_allow_self boolean := true;
  v_max_pts integer := 0;
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_user_id is null then
    raise exception 'invalid_user';
  end if;
  if p_points is null or p_points = 0 then
    raise exception 'invalid_points';
  end if;
  if abs(p_points) > 300 then
    raise exception 'points_out_of_range';
  end if;

  v_reason := trim(coalesce(p_reason, ''));
  if char_length(v_reason) < 2 or char_length(v_reason) > 280 then
    raise exception 'invalid_reason';
  end if;

  -- Clé d’idempotence OBLIGATOIRE (anti-farm)
  v_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_key is null then
    raise exception 'idempotency_key_required';
  end if;
  if char_length(v_key) > 120 then
    raise exception 'idempotency_key_too_long';
  end if;

  select log_id into v_id from public.reputation_idempotency where key = v_key;
  if v_id is not null then
    return v_id;
  end if;

  -- Préfixe catalogue (avant 1er segment métier)
  v_prefix := split_part(v_key, ':', 1);

  case v_prefix
    when 'reaction' then
      v_allow_other := true; v_allow_self := false; v_max_pts := 15;
    when 'create_post' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 10;
    when 'create_project' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 25;
    when 'create_mission' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 15;
    when 'join_project' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 20;
    when 'join_invite' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 20;
    when 'mission_accepted' then
      v_allow_other := true; v_allow_self := false; v_max_pts := 20;
    when 'mission_reward' then
      v_allow_other := true; v_allow_self := true; v_max_pts := 200;
    when 'mission_bonus' then
      v_allow_other := true; v_allow_self := true; v_max_pts := 20;
    when 'mission_lead' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 15;
    when 'project_status' then
      v_allow_other := true; v_allow_self := true; v_max_pts := 200;
    when 'profile_complete' then
      v_allow_other := false; v_allow_self := true; v_max_pts := 20;
    when 'reply_pin' then
      v_allow_other := true; v_allow_self := false; v_max_pts := 8;
    when 'reply_useful' then
      v_allow_other := true; v_allow_self := false; v_max_pts := 5;
    else
      raise exception 'unknown_award_key_prefix';
  end case;

  if abs(p_points) > v_max_pts then
    raise exception 'points_exceed_catalog';
  end if;

  if p_user_id = v_caller then
    if not v_allow_self then
      raise exception 'self_award_not_allowed';
    end if;
  else
    if not v_allow_other then
      raise exception 'other_award_not_allowed';
    end if;
  end if;

  -- Rate limits
  select count(*)::integer into v_hour_count
  from public.reputation_logs
  where awarded_by = v_caller
    and created_at > (timezone('utc'::text, now()) - interval '1 hour');
  if coalesce(v_hour_count, 0) >= 80 then
    raise exception 'rate_limited';
  end if;

  select coalesce(sum(abs(points_changed)), 0)::integer into v_day_points
  from public.reputation_logs
  where awarded_by = v_caller
    and created_at > (timezone('utc'::text, now()) - interval '1 day');
  if coalesce(v_day_points, 0) + abs(p_points) > 800 then
    raise exception 'daily_points_cap';
  end if;

  insert into public.reputation_logs (user_id, points_changed, reason, awarded_by)
  values (p_user_id, p_points, v_reason, v_caller)
  returning id into v_id;

  insert into public.reputation_idempotency (key, user_id, log_id)
  values (v_key, p_user_id, v_id)
  on conflict (key) do nothing;

  return v_id;
end;
$$;

-- ────────────────────────────────────────────────────────────
-- 6) Bulk notifications RPC (optionnel, client peut aussi multi-insert)
-- ────────────────────────────────────────────────────────────
create or replace function public.notify_many_users(
  p_user_ids uuid[],
  p_actor_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_route text default null,
  p_ref_id uuid default null,
  p_ref_type text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_n integer := 0;
  v_ids uuid[];
begin
  if v_caller is null then
    raise exception 'not_authenticated';
  end if;
  if p_actor_id is not null and p_actor_id <> v_caller then
    raise exception 'actor_mismatch';
  end if;

  select array_agg(distinct u)
  into v_ids
  from unnest(coalesce(p_user_ids, '{}'::uuid[])) as u
  where u is not null and u <> coalesce(p_actor_id, v_caller);

  if v_ids is null or array_length(v_ids, 1) is null then
    return 0;
  end if;

  -- Cap fan-out
  if array_length(v_ids, 1) > 100 then
    v_ids := v_ids[1:100];
  end if;

  insert into public.activity_notifications (
    user_id, actor_id, type, title, body, route, ref_id, ref_type
  )
  select
    uid, coalesce(p_actor_id, v_caller), p_type,
    left(coalesce(p_title, 'Notification'), 200),
    left(coalesce(p_body, ''), 500),
    p_route, p_ref_id, p_ref_type
  from unnest(v_ids) as uid;

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

revoke all on function public.notify_many_users(uuid[], uuid, text, text, text, text, uuid, text) from public;
grant execute on function public.notify_many_users(uuid[], uuid, text, text, text, text, uuid, text) to authenticated;

notify pgrst, 'reload schema';
