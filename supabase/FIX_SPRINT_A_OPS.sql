-- ============================================================
-- SPRINT A — Ops : coller dans Supabase → SQL Editor → Run
-- Idempotent : safe à rejouer. Couvre posts, replies, prefs, toggles.
-- ============================================================

-- ── 1. Profil prefs (dispo, locale, push) ───────────────────
alter table public.profiles
  add column if not exists available_for_missions boolean not null default true;
alter table public.profiles
  add column if not exists preferred_locale text not null default 'fr';
alter table public.profiles
  add column if not exists push_enabled boolean not null default true;

-- ── 2. Profil toggles (présence en ligne) ───────────────────
alter table public.profiles
  add column if not exists show_online_presence boolean not null default true;
alter table public.profiles
  add column if not exists reminders_enabled boolean not null default true;
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

-- ── 3. Posts hub ───────────────────────────────────────────
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

-- ── 4. Replies / threads ───────────────────────────────────
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
create index if not exists idx_replies_author on public.replies (author_id);

alter table public.replies enable row level security;

drop policy if exists "replies_select_public" on public.replies;
create policy "replies_select_public" on public.replies for select using (true);

drop policy if exists "replies_insert_auth" on public.replies;
create policy "replies_insert_auth" on public.replies for insert
  with check (auth.role() = 'authenticated' and auth.uid() = author_id);

drop policy if exists "replies_update_own" on public.replies;
create policy "replies_update_own" on public.replies for update
  using (auth.uid() = author_id);

drop policy if exists "replies_delete_own" on public.replies;
create policy "replies_delete_own" on public.replies for delete
  using (auth.uid() = author_id);

create table if not exists public.reply_awards (
  id uuid primary key default gen_random_uuid(),
  awarder_id uuid not null references public.profiles(id) on delete cascade,
  reply_id uuid not null references public.replies(id) on delete cascade,
  points_awarded integer not null default 0,
  created_at timestamptz not null default timezone('utc'::text, now()),
  unique (awarder_id, reply_id)
);

alter table public.reply_awards enable row level security;

drop policy if exists "reply_awards_select" on public.reply_awards;
create policy "reply_awards_select" on public.reply_awards for select using (true);

drop policy if exists "reply_awards_insert_auth" on public.reply_awards;
create policy "reply_awards_insert_auth" on public.reply_awards for insert
  with check (auth.role() = 'authenticated' and auth.uid() = awarder_id);

-- ── 5. Reload cache PostgREST ──────────────────────────────
notify pgrst, 'reload schema';

-- Diagnostic
select
  to_regclass('public.posts') as posts,
  to_regclass('public.replies') as replies,
  to_regclass('public.reply_awards') as reply_awards,
  (select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'last_seen_at') as last_seen_col,
  (select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'show_online_presence') as presence_col,
  (select column_name from information_schema.columns
   where table_schema = 'public' and table_name = 'profiles' and column_name = 'available_for_missions') as dispo_col;
