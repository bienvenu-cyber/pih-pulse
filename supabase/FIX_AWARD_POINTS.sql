-- Coller dans SQL Editor — S1 award_points + RLS
-- Idempotent. Voir migrations/20260717000001_award_points_rpc.sql

create table if not exists public.reputation_idempotency (
  key text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  log_id uuid not null references public.reputation_logs(id) on delete cascade,
  created_at timestamptz not null default timezone('utc'::text, now())
);
create index if not exists idx_reputation_idempotency_user
  on public.reputation_idempotency (user_id);
alter table public.reputation_idempotency enable row level security;
drop policy if exists "reputation_idempotency_select_own" on public.reputation_idempotency;
create policy "reputation_idempotency_select_own"
  on public.reputation_idempotency for select
  using (auth.uid() = user_id);

alter table public.reputation_logs
  add column if not exists awarded_by uuid references public.profiles(id) on delete set null;
create index if not exists idx_reputation_logs_awarded_by_created
  on public.reputation_logs (awarded_by, created_at desc)
  where awarded_by is not null;

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
  v_key text;
begin
  if v_caller is null then raise exception 'not_authenticated'; end if;
  if p_user_id is null then raise exception 'invalid_user'; end if;
  if p_points is null or p_points = 0 then raise exception 'invalid_points'; end if;
  if abs(p_points) > 300 then raise exception 'points_out_of_range'; end if;
  v_reason := trim(coalesce(p_reason, ''));
  if char_length(v_reason) < 2 or char_length(v_reason) > 280 then
    raise exception 'invalid_reason';
  end if;
  v_key := nullif(trim(coalesce(p_idempotency_key, '')), '');
  if v_key is not null then
    if char_length(v_key) > 120 then raise exception 'idempotency_key_too_long'; end if;
    select log_id into v_id from public.reputation_idempotency where key = v_key;
    if v_id is not null then return v_id; end if;
  end if;
  select count(*)::integer into v_hour_count
  from public.reputation_logs
  where awarded_by = v_caller
    and created_at > (timezone('utc'::text, now()) - interval '1 hour');
  if coalesce(v_hour_count, 0) >= 150 then raise exception 'rate_limited'; end if;
  insert into public.reputation_logs (user_id, points_changed, reason, awarded_by)
  values (p_user_id, p_points, v_reason, v_caller)
  returning id into v_id;
  if v_key is not null then
    insert into public.reputation_idempotency (key, user_id, log_id)
    values (v_key, p_user_id, v_id)
    on conflict (key) do nothing;
  end if;
  return v_id;
end;
$$;

revoke all on function public.award_points(uuid, integer, text, text) from public;
grant execute on function public.award_points(uuid, integer, text, text) to authenticated;
grant execute on function public.award_points(uuid, integer, text, text) to service_role;

drop policy if exists "Authenticated can insert reputation logs." on public.reputation_logs;

notify pgrst, 'reload schema';
