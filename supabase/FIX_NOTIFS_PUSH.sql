-- ============================================================
-- FIX — Notifs in-app + push (RLS + realtime)
-- À jouer sur la prod si les activity_notifications / push ne passent pas.
-- Date : 2026-07-19
-- ============================================================

-- 1) Table (idempotent)
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

-- 2) Policies RLS (insert pour autres users = obligatoire pour messages / réactions)
drop policy if exists "Users read own notifications." on public.activity_notifications;
create policy "Users read own notifications." on public.activity_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications." on public.activity_notifications;
create policy "Users update own notifications." on public.activity_notifications
  for update using (auth.uid() = user_id);

drop policy if exists "Authenticated can insert notifications." on public.activity_notifications;
create policy "Authenticated can insert notifications." on public.activity_notifications
  for insert with check (auth.role() = 'authenticated');

-- 3) Indexes scale
create index if not exists idx_activity_notifications_user_unread_created
  on public.activity_notifications (user_id, is_read, created_at desc);
create index if not exists idx_activity_notifications_user_created
  on public.activity_notifications (user_id, created_at desc);
create index if not exists idx_activity_notifications_actor_throttle
  on public.activity_notifications (user_id, actor_id, type, ref_id, created_at desc)
  where actor_id is not null;

-- 4) Colonnes push profil
alter table public.profiles add column if not exists expo_push_token text;
alter table public.profiles add column if not exists push_enabled boolean default true;
alter table public.profiles add column if not exists reminders_enabled boolean default true;

-- 5) Realtime (Dashboard → Replication si ça échoue ici)
do $$
begin
  begin
    alter publication supabase_realtime add table public.activity_notifications;
  exception when duplicate_object then null;
  when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when duplicate_object then null;
  when others then null;
  end;
end $$;

notify pgrst, 'reload schema';
