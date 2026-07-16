-- Coller dans SQL Editor (Sprint C/D)
-- Invitations projet + RPC delete_own_account

create table if not exists public.project_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default timezone('utc'::text, now())
);

create unique index if not exists project_invites_pending_unique
  on public.project_invites (project_id, invitee_id)
  where status = 'pending';

create index if not exists idx_project_invites_invitee
  on public.project_invites (invitee_id, status);

alter table public.project_invites enable row level security;

drop policy if exists "invites_select_parties" on public.project_invites;
create policy "invites_select_parties" on public.project_invites
  for select using (
    auth.uid() = invitee_id
    or auth.uid() = inviter_id
    or exists (
      select 1 from public.projects p
      where p.id = project_id and p.creator_id = auth.uid()
    )
  );

drop policy if exists "invites_insert_auth" on public.project_invites;
create policy "invites_insert_auth" on public.project_invites
  for insert with check (
    auth.role() = 'authenticated' and auth.uid() = inviter_id
  );

drop policy if exists "invites_update_parties" on public.project_invites;
create policy "invites_update_parties" on public.project_invites
  for update using (auth.uid() = invitee_id or auth.uid() = inviter_id);

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    full_name = 'Compte supprimé',
    username = null,
    bio = null,
    avatar_url = null,
    phone = null,
    skills = '{}',
    portfolio = '{}'::jsonb,
    expo_push_token = null,
    push_enabled = false,
    show_online_presence = false,
    available_for_missions = false,
    updated_at = timezone('utc'::text, now())
  where id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

notify pgrst, 'reload schema';
