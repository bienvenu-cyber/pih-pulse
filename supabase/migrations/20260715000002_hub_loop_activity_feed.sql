-- ============================================================
-- Hub loop + activity notifications + events (feed)
-- Date : 15 Juillet 2026
-- ============================================================

-- ─── Missions : livrable + statut "review" ───────────────────
alter table public.missions
  add column if not exists deliverable_url text,
  add column if not exists deliverable_note text,
  add column if not exists submitted_at timestamptz;

-- Étendre le check status (drop + recreate)
alter table public.missions drop constraint if exists missions_status_check;
alter table public.missions
  add constraint missions_status_check
  check (status in ('open', 'in_progress', 'review', 'completed', 'cancelled'));

-- Assignee peut soumettre un livrable (in_progress → review) et mettre à jour son assignation
drop policy if exists "Assignees can update own missions." on public.missions;
create policy "Assignees can update own missions." on public.missions
  for update using (
    auth.uid() = assignee_id
    and status in ('in_progress', 'review')
  )
  with check (auth.uid() = assignee_id);

-- Créateurs peuvent update applications (approve/reject)
drop policy if exists "Creators can update applications." on public.mission_applications;
create policy "Creators can update applications." on public.mission_applications
  for update using (
    exists (
      select 1 from public.missions m
      join public.projects p on p.id = m.project_id
      where m.id = mission_applications.mission_id
        and p.creator_id = auth.uid()
    )
  );

-- Leads peuvent aussi update applications
drop policy if exists "Leads can update applications." on public.mission_applications;
create policy "Leads can update applications." on public.mission_applications
  for update using (
    exists (
      select 1 from public.missions m
      join public.project_members pm on pm.project_id = m.project_id
      where m.id = mission_applications.mission_id
        and pm.user_id = auth.uid()
        and (
          pm.role ilike '%founder%'
          or pm.role ilike '%lead%'
          or pm.role ilike '%creator%'
        )
    )
  );

-- ─── Activity notifications (in-app + deep links) ────────────
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

create index if not exists idx_activity_notifications_user
  on public.activity_notifications (user_id, created_at desc);
create index if not exists idx_activity_notifications_unread
  on public.activity_notifications (user_id) where is_read = false;

alter table public.activity_notifications enable row level security;

drop policy if exists "Users read own notifications." on public.activity_notifications;
create policy "Users read own notifications." on public.activity_notifications
  for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications." on public.activity_notifications;
create policy "Users update own notifications." on public.activity_notifications
  for update using (auth.uid() = user_id);

-- Insert: authenticated (app writes for other users after actions)
drop policy if exists "Authenticated can insert notifications." on public.activity_notifications;
create policy "Authenticated can insert notifications." on public.activity_notifications
  for insert with check (auth.role() = 'authenticated');

-- ─── Hub events (feed) ───────────────────────────────────────
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

drop policy if exists "Events are public." on public.hub_events;
create policy "Events are public." on public.hub_events
  for select using (true);

drop policy if exists "Authenticated can insert events." on public.hub_events;
create policy "Authenticated can insert events." on public.hub_events
  for insert with check (auth.role() = 'authenticated' and auth.uid() = created_by);

-- Seed event optionnel (ignore si déjà présent par titre)
insert into public.hub_events (title, description, location, starts_at)
select
  'Hackathon FinTech Bénin — Parakou Innovation Hub',
  '48 h de construction collective autour de la fintech locale.',
  'Parakou Innovation Hub',
  timezone('utc'::text, now()) + interval '14 days'
where not exists (
  select 1 from public.hub_events
  where title like 'Hackathon FinTech%'
);
