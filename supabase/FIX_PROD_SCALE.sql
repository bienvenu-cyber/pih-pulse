-- ============================================================
-- PROD APPLY — Scale S0.5 + S0 indexes + (optionnel suite)
-- Coller UNE FOIS dans Supabase → SQL Editor → Run
-- Idempotent (IF NOT EXISTS / DROP IF EXISTS)
-- ============================================================

-- ─── A) FIX_NOTIFICATIONS_SCALE ─────────────────────────────
create index if not exists idx_activity_notifications_user_unread_created
  on public.activity_notifications (user_id, is_read, created_at desc);
create index if not exists idx_activity_notifications_type
  on public.activity_notifications (type);
create index if not exists idx_activity_notifications_ref
  on public.activity_notifications (ref_type, ref_id)
  where ref_id is not null;
create index if not exists idx_activity_notifications_actor_throttle
  on public.activity_notifications (user_id, actor_id, type, ref_id, created_at desc)
  where actor_id is not null;
create index if not exists idx_messages_receiver_unread
  on public.messages (receiver_id)
  where is_read = false and project_id is null;
create index if not exists idx_messages_project_unread
  on public.messages (project_id, is_read)
  where project_id is not null and is_read = false;

do $$
begin
  begin
    alter publication supabase_realtime add table public.activity_notifications;
  exception when others then null;
  end;
  begin
    alter publication supabase_realtime add table public.messages;
  exception when others then null;
  end;
end $$;

-- ─── B) FIX_SCALE_S0 indexes ────────────────────────────────
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
create index if not exists idx_boosts_ref on public.boosts (ref_id, ref_type);

notify pgrst, 'reload schema';

-- ─── C) Ensuite (séparé) : FIX_AWARD_POINTS.sql ─────────────
-- ─── D) Edge Function send-push : supabase functions deploy ─
