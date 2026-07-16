-- ============================================================
-- Migration : politiques missions (claim + leads) + reputation insert
-- Date : 15 Juillet 2026
-- Pour bases déjà déployées — déjà inclus dans supabase_schema.sql
-- ============================================================

-- Leads (via project_members) peuvent gérer les missions
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

-- Contributeurs : accepter une mission ouverte
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

-- Insertion de logs de réputation (app client)
drop policy if exists "Authenticated can insert reputation logs." on public.reputation_logs;
create policy "Authenticated can insert reputation logs." on public.reputation_logs
  for insert with check (auth.role() = 'authenticated');
