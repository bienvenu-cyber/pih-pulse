-- ============================================================
-- FIX RAPIDE — coller dans Supabase → SQL Editor → Run
-- Réponses / threads / mentions / pin / Impact feedback
-- ============================================================

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

notify pgrst, 'reload schema';

select to_regclass('public.replies') as replies_ok;
