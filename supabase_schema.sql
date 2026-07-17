-- ============================================================
-- PIH Pulse — Schéma Supabase (SOURCE DE VÉRITÉ UNIQUE)
-- ============================================================
-- Utiliser ce fichier pour initialiser une nouvelle base.
-- Les fichiers dans supabase/migrations/ sont l'historique
-- incrémental pour les bases déjà déployées (ne pas rejouer
-- à l'aveugle si le schéma complet a déjà été appliqué).
--
-- Dernière consolidation : 2026-07-15
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- 1. PROFILES (lié à auth.users)
-- ────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  skills text[] default '{}',
  role text check (role in (
    'developer', 'designer', 'entrepreneur', 'product_creator',
    'mentor', 'investisseur', 'influenceur', 'secretaire', 'other'
  )),
  reputation_points integer default 0,
  expo_push_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint username_length check (char_length(username) >= 3)
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are public." on public.profiles;
create policy "Profiles are public." on public.profiles
  for select using (true);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- 2. PROJECTS
-- ────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_description text not null,
  description text,
  avatar_url text,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  -- idea → prototype → mvp → scale (équivalent "launched" côté produit)
  status text default 'idea' check (status in ('idea', 'prototype', 'mvp', 'scale')),
  links jsonb default '{}'::jsonb,
  skills_needed text[] default '{}',
  location text default 'Parakou',
  roles_needed text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

drop policy if exists "Projects are public." on public.projects;
create policy "Projects are public." on public.projects
  for select using (true);

drop policy if exists "Authenticated users can insert projects." on public.projects;
create policy "Authenticated users can insert projects." on public.projects
  for insert with check (auth.role() = 'authenticated' and auth.uid() = creator_id);

drop policy if exists "Creators can update projects." on public.projects;
create policy "Creators can update projects." on public.projects
  for update using (auth.uid() = creator_id);

drop policy if exists "Creators can delete projects." on public.projects;
create policy "Creators can delete projects." on public.projects
  for delete using (auth.uid() = creator_id);

-- ────────────────────────────────────────────────────────────
-- 3. PROJECT MEMBERS
-- ────────────────────────────────────────────────────────────
create table if not exists public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'contributor',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(project_id, user_id)
);

alter table public.project_members enable row level security;

drop policy if exists "Project members are public." on public.project_members;
create policy "Project members are public." on public.project_members
  for select using (true);

drop policy if exists "Authenticated users can join projects." on public.project_members;
create policy "Authenticated users can join projects." on public.project_members
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

drop policy if exists "Members can leave projects." on public.project_members;
create policy "Members can leave projects." on public.project_members
  for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 4. MISSIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.missions (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text not null,
  description text,
  difficulty text default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  points_reward integer not null default 50,
  skills_required text[] default '{}',
  status text default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  assignee_id uuid references public.profiles(id) on delete set null,
  deadline timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.missions enable row level security;

drop policy if exists "Missions are public." on public.missions;
create policy "Missions are public." on public.missions
  for select using (true);

-- Créateur du projet : gestion complète
drop policy if exists "Project creators can manage missions." on public.missions;
create policy "Project creators can manage missions." on public.missions
  for all using (
    exists (
      select 1 from public.projects
      where projects.id = missions.project_id and projects.creator_id = auth.uid()
    )
  );

-- Leads (via project_members) : insert / update
drop policy if exists "Project leads can manage missions." on public.missions;
create policy "Project leads can manage missions." on public.missions
  for all using (
    exists (
      select 1 from public.project_members
      where project_members.project_id = missions.project_id
        and project_members.user_id = auth.uid()
        and (
          project_members.role ilike '%founder%'
          or project_members.role ilike '%lead%'
          or project_members.role ilike '%creator%'
        )
    )
  );

-- Contributeurs : accepter une mission ouverte (claim)
drop policy if exists "Authenticated can claim open missions." on public.missions;
create policy "Authenticated can claim open missions." on public.missions
  for update using (
    auth.role() = 'authenticated'
    and status = 'open'
  )
  with check (
    auth.uid() = assignee_id
    and status = 'in_progress'
  );

-- ────────────────────────────────────────────────────────────
-- 5. MISSION APPLICATIONS
-- ────────────────────────────────────────────────────────────
create table if not exists public.mission_applications (
  id uuid default gen_random_uuid() primary key,
  mission_id uuid references public.missions(id) on delete cascade not null,
  applicant_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  pitch text,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,

  unique(mission_id, applicant_id)
);

alter table public.mission_applications enable row level security;

drop policy if exists "Applicants and creators can select applications." on public.mission_applications;
create policy "Applicants and creators can select applications." on public.mission_applications
  for select using (
    auth.uid() = applicant_id or
    exists (
      select 1 from public.missions
      join public.projects on projects.id = missions.project_id
      where missions.id = mission_applications.mission_id and projects.creator_id = auth.uid()
    )
  );

drop policy if exists "Authenticated users can apply for missions." on public.mission_applications;
create policy "Authenticated users can apply for missions." on public.mission_applications
  for insert with check (auth.role() = 'authenticated' and auth.uid() = applicant_id);

drop policy if exists "Applicants can cancel applications." on public.mission_applications;
create policy "Applicants can cancel applications." on public.mission_applications
  for delete using (auth.uid() = applicant_id);

-- ────────────────────────────────────────────────────────────
-- 6. REPUTATION LOGS
-- ────────────────────────────────────────────────────────────
create table if not exists public.reputation_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  points_changed integer not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reputation_logs enable row level security;

drop policy if exists "Reputation logs are viewable by everyone." on public.reputation_logs;
create policy "Reputation logs are viewable by everyone." on public.reputation_logs
  for select using (true);

-- S1 : plus d'INSERT client direct — utiliser RPC award_points (voir migration award_points)
-- Policy insert volontairement absente pour authenticated.
-- create policy "Authenticated can insert reputation logs." ... RETIRÉE

-- ────────────────────────────────────────────────────────────
-- 7. MESSAGES (DM + chat de groupe projet)
-- ────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade, -- null = message de groupe
  project_id uuid references public.projects(id) on delete cascade,
  text text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

drop policy if exists "Users can see direct or project messages." on public.messages;
create policy "Users can see direct or project messages." on public.messages
  for select using (
    auth.uid() = sender_id or
    auth.uid() = receiver_id or
    (
      project_id is not null and
      exists (
        select 1 from public.project_members
        where project_members.project_id = messages.project_id
          and project_members.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Users can post direct or project messages." on public.messages;
create policy "Users can post direct or project messages." on public.messages
  for insert with check (
    auth.role() = 'authenticated' and
    auth.uid() = sender_id and
    (
      project_id is null or
      exists (
        select 1 from public.project_members
        where project_members.project_id = messages.project_id
          and project_members.user_id = auth.uid()
      )
    )
  );

drop policy if exists "Receivers can update read status of direct messages." on public.messages;
create policy "Receivers can update read status of direct messages." on public.messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);

-- ────────────────────────────────────────────────────────────
-- 8. REACTIONS (🔥 hot / 💡 idea)
-- ────────────────────────────────────────────────────────────
create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ref_id uuid not null,
  ref_type text not null check (ref_type in ('project', 'mission', 'post')),
  type text not null check (type in ('hot', 'idea', 'ship', 'contribute')),
  created_at timestamptz not null default now(),
  unique (user_id, ref_id, ref_type, type)
);

create index if not exists idx_reactions_ref on public.reactions (ref_id, ref_type);
create index if not exists idx_reactions_user on public.reactions (user_id, ref_id, ref_type);

alter table public.reactions enable row level security;

drop policy if exists "reactions_select_public" on public.reactions;
create policy "reactions_select_public"
  on public.reactions for select using (true);

drop policy if exists "reactions_insert_own" on public.reactions;
create policy "reactions_insert_own"
  on public.reactions for insert with check (auth.uid() = user_id);

drop policy if exists "reactions_delete_own" on public.reactions;
create policy "reactions_delete_own"
  on public.reactions for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 9. BOOSTS (⚡)
-- ────────────────────────────────────────────────────────────
create table if not exists public.boosts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ref_id uuid not null,
  ref_type text not null check (ref_type in ('project', 'mission', 'post')),
  created_at timestamptz not null default now(),
  unique (user_id, ref_id, ref_type)
);

create index if not exists idx_boosts_ref on public.boosts (ref_id, ref_type);
create index if not exists idx_boosts_user on public.boosts (user_id, ref_id, ref_type);

alter table public.boosts enable row level security;

drop policy if exists "boosts_select_public" on public.boosts;
create policy "boosts_select_public"
  on public.boosts for select using (true);

drop policy if exists "boosts_insert_own" on public.boosts;
create policy "boosts_insert_own"
  on public.boosts for insert with check (auth.uid() = user_id);

drop policy if exists "boosts_delete_own" on public.boosts;
create policy "boosts_delete_own"
  on public.boosts for delete using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 10. TRIGGERS
-- ────────────────────────────────────────────────────────────

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'developer'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Sync profiles.reputation_points when a log is inserted
create or replace function public.update_profile_reputation()
returns trigger as $$
begin
  update public.profiles
  set reputation_points = reputation_points + new.points_changed
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_reputation_log_added on public.reputation_logs;
create trigger on_reputation_log_added
  after insert on public.reputation_logs
  for each row execute procedure public.update_profile_reputation();

-- award_points RPC + idempotency : migrations/20260717000001_award_points_rpc.sql
-- (appliqué aussi via FIX_AWARD_POINTS.sql en prod)

-- ────────────────────────────────────────────────────────────
-- COMMENTAIRES
-- ────────────────────────────────────────────────────────────
comment on table public.reactions is 'Réactions Impact (idea/hot/ship/contribute) sur projets, missions et posts';
comment on table public.boosts is 'Boosts ⚡ — ranking feed uniquement (0 Impact)';
comment on table public.reputation_logs is 'Historique des gains de points ; trigger met à jour profiles.reputation_points ; écriture via award_points()';

-- ────────────────────────────────────────────────────────────
-- 11. ACTIVITY NOTIFICATIONS (in-app + deep links)
-- ────────────────────────────────────────────────────────────
create table if not exists public.activity_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  body text not null,
  route text,
  ref_id uuid,
  ref_type text,
  is_read boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.activity_notifications enable row level security;

-- ────────────────────────────────────────────────────────────
-- 12. HUB EVENTS (feed)
-- ────────────────────────────────────────────────────────────
create table if not exists public.hub_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  location text default 'Parakou',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now())
);
alter table public.hub_events enable row level security;

-- Missions livrable columns (hub loop)
-- deliverable_url, deliverable_note, submitted_at, status includes 'review'
-- See migrations/20260715000002_hub_loop_activity_feed.sql for full policies.

-- ────────────────────────────────────────────────────────────
-- 13. HUB POSTS (feed publications indépendantes)
-- ────────────────────────────────────────────────────────────
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

-- S0 scale — listes / feed / chat (voir migrations/20260717000000_scale_s0_indexes.sql)
create index if not exists idx_projects_created on public.projects (created_at desc);
create index if not exists idx_projects_creator on public.projects (creator_id);
create index if not exists idx_projects_status_created on public.projects (status, created_at desc);
create index if not exists idx_missions_created on public.missions (created_at desc);
create index if not exists idx_missions_status_created on public.missions (status, created_at desc);
create index if not exists idx_missions_project on public.missions (project_id);
create index if not exists idx_project_members_user on public.project_members (user_id);
create index if not exists idx_project_members_project on public.project_members (project_id);
create index if not exists idx_messages_project_created
  on public.messages (project_id, created_at desc) where project_id is not null;
create index if not exists idx_messages_dm_created
  on public.messages (receiver_id, created_at desc) where project_id is null;
create index if not exists idx_messages_sender_receiver
  on public.messages (sender_id, receiver_id, created_at desc) where project_id is null;
create index if not exists idx_reputation_logs_user_created
  on public.reputation_logs (user_id, created_at desc);
create index if not exists idx_activity_notifications_user_created
  on public.activity_notifications (user_id, created_at desc);

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

-- reaction_awards (1× points par user×ref×type) — voir migration impact
create table if not exists public.reaction_awards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ref_id uuid not null,
  ref_type text not null check (ref_type in ('project', 'mission', 'post')),
  reaction_type text not null,
  points_awarded integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
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
  on public.reaction_awards for insert with check (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────
-- 14. REPLIES (Réponses / Questions / Échanges)
-- ────────────────────────────────────────────────────────────
create table if not exists public.replies (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  ref_type text not null check (ref_type in ('post', 'mission', 'project')),
  ref_id uuid not null,
  parent_id uuid references public.replies(id) on delete cascade,
  body text not null check (char_length(trim(body)) >= 1 and char_length(body) <= 2000),
  mention_ids uuid[] not null default '{}',
  pinned_at timestamptz,
  pinned_by uuid references public.profiles(id) on delete set null,
  useful_count integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz
);

create index if not exists idx_replies_ref on public.replies (ref_type, ref_id, created_at desc);
create index if not exists idx_replies_parent on public.replies (parent_id);

alter table public.replies enable row level security;

drop policy if exists "replies_select_public" on public.replies;
create policy "replies_select_public" on public.replies for select using (true);

drop policy if exists "replies_insert_auth" on public.replies;
create policy "replies_insert_auth" on public.replies for insert
  with check (auth.role() = 'authenticated' and auth.uid() = author_id);

drop policy if exists "replies_update_own" on public.replies;
create policy "replies_update_own" on public.replies for update
  using (auth.uid() = author_id or auth.role() = 'authenticated');

drop policy if exists "replies_delete_own" on public.replies;
create policy "replies_delete_own" on public.replies for delete
  using (auth.uid() = author_id);

create table if not exists public.reply_awards (
  id uuid primary key default gen_random_uuid(),
  reply_id uuid not null references public.replies(id) on delete cascade,
  awarder_id uuid not null references public.profiles(id) on delete cascade,
  award_type text not null check (award_type in ('useful', 'pinned')),
  points_awarded integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (reply_id, award_type)
);

alter table public.reply_awards enable row level security;

drop policy if exists "reply_awards_select" on public.reply_awards;
create policy "reply_awards_select" on public.reply_awards for select using (true);

drop policy if exists "reply_awards_insert_auth" on public.reply_awards;
create policy "reply_awards_insert_auth" on public.reply_awards for insert
  with check (auth.role() = 'authenticated' and auth.uid() = awarder_id);
