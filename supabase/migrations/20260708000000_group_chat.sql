-- Migration: Add Group Chat Support to Messages
-- Date: 2026-07-08

-- 1. Rendre le destinataire optionnel (receveur = NULL pour les messages de groupe)
alter table public.messages alter column receiver_id drop not null;

-- 2. Ajouter la référence au projet
alter table public.messages add column project_id uuid references public.projects(id) on delete cascade;

-- 3. Mettre à jour les règles de sécurité RLS
drop policy if exists "Users can see messages where they are sender or receiver." on public.messages;
drop policy if exists "Users can insert messages as themselves." on public.messages;
drop policy if exists "Receivers can update read status of their received messages." on public.messages;

-- Règle de lecture : On voit le message si on est l'expéditeur, le destinataire, ou membre du projet lié
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

-- Règle d'écriture : On peut poster si on est soi-même et (soit c'est un message privé, soit on est membre du projet)
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

-- Règle de mise à jour (lectures) : Inchangée pour les messages privés
create policy "Receivers can update read status of direct messages." on public.messages
  for update using (auth.uid() = receiver_id)
  with check (auth.uid() = receiver_id);
