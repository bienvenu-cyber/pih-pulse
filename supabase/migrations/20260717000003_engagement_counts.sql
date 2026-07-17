-- ============================================================
-- S1 — Compteurs réactions / boosts dénormalisés
-- Table unique (ref_type, ref_id) maintenue par triggers.
-- ============================================================

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

create index if not exists idx_engagement_counts_ref
  on public.engagement_counts (ref_id, ref_type);

alter table public.engagement_counts enable row level security;

drop policy if exists "engagement_counts_select_public" on public.engagement_counts;
create policy "engagement_counts_select_public"
  on public.engagement_counts for select using (true);
-- écriture uniquement via triggers / security definer (pas d’insert client)

create or replace function public.ensure_engagement_row(
  p_ref_type text,
  p_ref_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.engagement_counts (ref_type, ref_id)
  values (p_ref_type, p_ref_id)
  on conflict (ref_type, ref_id) do nothing;
end;
$$;

create or replace function public.tg_reactions_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_col text;
  v_type text;
  v_ref_type text;
  v_ref_id uuid;
  v_delta integer;
begin
  if tg_op = 'INSERT' then
    v_type := new.type;
    v_ref_type := new.ref_type;
    v_ref_id := new.ref_id;
    v_delta := 1;
  elsif tg_op = 'DELETE' then
    v_type := old.type;
    v_ref_type := old.ref_type;
    v_ref_id := old.ref_id;
    v_delta := -1;
  else
    return null;
  end if;

  v_col := case v_type
    when 'hot' then 'reaction_hot'
    when 'idea' then 'reaction_idea'
    when 'ship' then 'reaction_ship'
    when 'contribute' then 'reaction_contribute'
    else null
  end;
  if v_col is null then
    return null;
  end if;

  perform public.ensure_engagement_row(v_ref_type, v_ref_id);

  execute format(
    'update public.engagement_counts
     set %I = greatest(0, %I + $1), updated_at = timezone(''utc''::text, now())
     where ref_type = $2 and ref_id = $3',
    v_col, v_col
  ) using v_delta, v_ref_type, v_ref_id;

  return null;
end;
$$;

drop trigger if exists trg_reactions_engagement on public.reactions;
create trigger trg_reactions_engagement
  after insert or delete on public.reactions
  for each row execute function public.tg_reactions_engagement();

create or replace function public.tg_boosts_engagement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref_type text;
  v_ref_id uuid;
  v_delta integer;
begin
  if tg_op = 'INSERT' then
    v_ref_type := new.ref_type;
    v_ref_id := new.ref_id;
    v_delta := 1;
  elsif tg_op = 'DELETE' then
    v_ref_type := old.ref_type;
    v_ref_id := old.ref_id;
    v_delta := -1;
  else
    return null;
  end if;

  perform public.ensure_engagement_row(v_ref_type, v_ref_id);

  update public.engagement_counts
  set boosts = greatest(0, boosts + v_delta),
      updated_at = timezone('utc'::text, now())
  where ref_type = v_ref_type and ref_id = v_ref_id;

  return null;
end;
$$;

drop trigger if exists trg_boosts_engagement on public.boosts;
create trigger trg_boosts_engagement
  after insert or delete on public.boosts
  for each row execute function public.tg_boosts_engagement();

-- Backfill depuis l’existant (idempotent via truncate+rebuild safe pour table neuve)
insert into public.engagement_counts (
  ref_type, ref_id,
  reaction_hot, reaction_idea, reaction_ship, reaction_contribute, boosts
)
select
  r.ref_type,
  r.ref_id,
  count(*) filter (where r.type = 'hot')::integer,
  count(*) filter (where r.type = 'idea')::integer,
  count(*) filter (where r.type = 'ship')::integer,
  count(*) filter (where r.type = 'contribute')::integer,
  0
from public.reactions r
group by r.ref_type, r.ref_id
on conflict (ref_type, ref_id) do update set
  reaction_hot = excluded.reaction_hot,
  reaction_idea = excluded.reaction_idea,
  reaction_ship = excluded.reaction_ship,
  reaction_contribute = excluded.reaction_contribute,
  updated_at = timezone('utc'::text, now());

insert into public.engagement_counts (ref_type, ref_id, boosts)
select b.ref_type, b.ref_id, count(*)::integer
from public.boosts b
group by b.ref_type, b.ref_id
on conflict (ref_type, ref_id) do update set
  boosts = excluded.boosts,
  updated_at = timezone('utc'::text, now());

notify pgrst, 'reload schema';
