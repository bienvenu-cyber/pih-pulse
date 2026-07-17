-- Coller dans SQL Editor — S0 scale indexes (idempotent)
-- Voir aussi migrations/20260717000000_scale_s0_indexes.sql

create index if not exists idx_projects_created
  on public.projects (created_at desc);
create index if not exists idx_projects_creator
  on public.projects (creator_id);
create index if not exists idx_projects_status_created
  on public.projects (status, created_at desc);

create index if not exists idx_missions_created
  on public.missions (created_at desc);
create index if not exists idx_missions_status_created
  on public.missions (status, created_at desc);
create index if not exists idx_missions_project
  on public.missions (project_id);

create index if not exists idx_project_members_user
  on public.project_members (user_id);
create index if not exists idx_project_members_project
  on public.project_members (project_id);

create index if not exists idx_messages_project_created
  on public.messages (project_id, created_at desc)
  where project_id is not null;
create index if not exists idx_messages_dm_created
  on public.messages (receiver_id, created_at desc)
  where project_id is null;
create index if not exists idx_messages_sender_receiver
  on public.messages (sender_id, receiver_id, created_at desc)
  where project_id is null;

create index if not exists idx_reputation_logs_user_created
  on public.reputation_logs (user_id, created_at desc);
create index if not exists idx_activity_notifications_user_created
  on public.activity_notifications (user_id, created_at desc);

create index if not exists idx_boosts_ref
  on public.boosts (ref_id, ref_type);

notify pgrst, 'reload schema';
