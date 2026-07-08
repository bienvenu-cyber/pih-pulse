-- SQL Schema for PIH Pulse
-- Copy and paste this script into the Supabase SQL Editor to initialize all tables, triggers, and RLS policies.

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE (Linked to Supabase Auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  skills text[] default '{}',
  role text check (role in ('developer', 'designer', 'entrepreneur', 'product_creator', 'mentor', 'investisseur', 'influenceur', 'secretaire', 'other')),
  reputation_points integer default 0,
  expo_push_token text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint username_length check (char_length(username) >= 3)
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

create policy "Profiles are public." on public.profiles
  for select using (true);

create policy "Users can update own profile." on public.profiles
  for update using (auth.uid() = id);

-- 2. PROJECTS TABLE
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  short_description text not null,
  description text,
  avatar_url text,
  creator_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'idea' check (status in ('idea', 'prototype', 'mvp', 'scale')),
  links jsonb default '{}'::jsonb, -- e.g., {"github": "...", "figma": "..."}
  skills_needed text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.projects enable row level security;

create policy "Projects are public." on public.projects
  for select using (true);

create policy "Authenticated users can insert projects." on public.projects
  for insert with check (auth.role() = 'authenticated' and auth.uid() = creator_id);

create policy "Creators can update projects." on public.projects
  for update using (auth.uid() = creator_id);

create policy "Creators can delete projects." on public.projects
  for delete using (auth.uid() = creator_id);

-- 3. PROJECT MEMBERS TABLE
create table public.project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text default 'contributor',
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(project_id, user_id)
);

alter table public.project_members enable row level security;

create policy "Project members are public." on public.project_members
  for select using (true);

create policy "Authenticated users can join projects." on public.project_members
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Members can leave projects." on public.project_members
  for delete using (auth.uid() = user_id);

-- 4. MISSIONS TABLE
create table public.missions (
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

create policy "Missions are public." on public.missions
  for select using (true);

create policy "Project creators can manage missions." on public.missions
  for all using (
    exists (
      select 1 from public.projects 
      where projects.id = missions.project_id and projects.creator_id = auth.uid()
    )
  );

-- 5. MISSION APPLICATIONS TABLE
create table public.mission_applications (
  id uuid default gen_random_uuid() primary key,
  mission_id uuid references public.missions(id) on delete cascade not null,
  applicant_id uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  pitch text,
  applied_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  unique(mission_id, applicant_id)
);

alter table public.mission_applications enable row level security;

create policy "Applicants and creators can select applications." on public.mission_applications
  for select using (
    auth.uid() = applicant_id or 
    exists (
      select 1 from public.missions 
      join public.projects on projects.id = missions.project_id
      where missions.id = mission_applications.mission_id and projects.creator_id = auth.uid()
    )
  );

create policy "Authenticated users can apply for missions." on public.mission_applications
  for insert with check (auth.role() = 'authenticated' and auth.uid() = applicant_id);

create policy "Applicants can cancel applications." on public.mission_applications
  for delete using (auth.uid() = applicant_id);

-- 6. REPUTATION LOGS TABLE
create table public.reputation_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  points_changed integer not null,
  reason text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.reputation_logs enable row level security;

create policy "Reputation logs are viewable by everyone." on public.reputation_logs
  for select using (true);

-- 7. AUTO-CREATE PROFILE ON SIGNUP TRIGGER
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    'developer' -- default role
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 8. REPUTATION UPDATE FUNCTION & TRIGGER (Updates profiles.reputation_points when a log is added)
create or replace function public.update_profile_reputation()
returns trigger as $$
begin
  update public.profiles
  set reputation_points = reputation_points + new.points_changed
  where id = new.user_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_reputation_log_added
  after insert on public.reputation_logs
  for each row execute procedure public.update_profile_reputation();

-- 9. MESSAGES TABLE (For custom messaging chat: direct and project group chat)
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  receiver_id uuid references public.profiles(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  text text not null,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;

create policy "Users can see direct or project messages." on public.messages
  for select using (
    auth.uid() = sender_id or 
    auth.uid() = receiver_id or
    (
      project_id is not null and 
      exists (
        select 1 from public.project_members 
        where project_members.project_id = messages.project_id and project_members.user_id = auth.uid()
      )
    )
  );

create policy "Users can post direct or project messages." on public.messages
  for insert with check (
    auth.role() = 'authenticated' and 
    auth.uid() = sender_id and 
    (
      project_id is null or 
      exists (
        select 1 from public.project_members 
        where project_members.project_id = messages.project_id and project_members.user_id = auth.uid()
      )
    )
  );

create policy "Receivers can update read status of direct messages." on public.messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);
