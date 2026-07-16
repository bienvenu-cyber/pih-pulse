-- ============================================================
-- Impact system: reaction types, one-shot awards, status rewards
-- ============================================================

-- Expand reaction types: hot (= Solide), idea, ship, contribute
alter table public.reactions drop constraint if exists reactions_type_check;
alter table public.reactions
  add constraint reactions_type_check
  check (type in ('hot', 'idea', 'ship', 'contribute'));

-- One-shot points per user × post × reaction type
create table if not exists public.reaction_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ref_id uuid not null,
  ref_type text not null check (ref_type in ('project', 'mission')),
  reaction_type text not null check (reaction_type in ('hot', 'idea', 'ship', 'contribute')),
  points_awarded integer not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, ref_id, ref_type, reaction_type)
);

create index if not exists idx_reaction_awards_ref
  on public.reaction_awards (ref_id, ref_type);

alter table public.reaction_awards enable row level security;

drop policy if exists "reaction_awards_select_public" on public.reaction_awards;
create policy "reaction_awards_select_public"
  on public.reaction_awards for select using (true);

drop policy if exists "reaction_awards_insert_own" on public.reaction_awards;
create policy "reaction_awards_insert_own"
  on public.reaction_awards for insert
  with check (auth.uid() = user_id);

-- Project status transition rewards (anti-farm)
create table if not exists public.project_status_rewards (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  status text not null check (status in ('prototype', 'mvp', 'scale')),
  points_awarded integer not null,
  granted_at timestamptz not null default now(),
  unique (project_id, status)
);

alter table public.project_status_rewards enable row level security;

drop policy if exists "project_status_rewards_select" on public.project_status_rewards;
create policy "project_status_rewards_select"
  on public.project_status_rewards for select using (true);

drop policy if exists "project_status_rewards_insert_auth" on public.project_status_rewards;
create policy "project_status_rewards_insert_auth"
  on public.project_status_rewards for insert
  with check (auth.role() = 'authenticated');

-- Profile completion Impact bonus (once)
alter table public.profiles
  add column if not exists impact_profile_bonus boolean not null default false;
