-- Notifications scale : indexes + realtime publication
-- Scalable count/filter pour 100k users

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

-- Messages unread (DM + projet)
create index if not exists idx_messages_receiver_unread
  on public.messages (receiver_id)
  where is_read = false and project_id is null;

create index if not exists idx_messages_project_unread
  on public.messages (project_id, is_read)
  where project_id is not null and is_read = false;

-- Realtime (si pas déjà dans publication)
-- Supabase Dashboard → Database → Replication : activer activity_notifications + messages
-- Ici on tente d’ajouter à supabase_realtime
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
