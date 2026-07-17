-- ============================================================
-- S2 — Rétention données chaudes (notifs / idempotency)
-- Appeler manuellement ou via pg_cron (Dashboard → Database → Cron)
-- ============================================================

/**
 * purge_retention(p_notif_read_days, p_notif_unread_days, p_idempotency_days)
 * - notifs lues > N jours → delete
 * - notifs non lues > M jours → delete (anti-infini)
 * - clés idempotency award > K jours → delete
 */
create or replace function public.purge_retention(
  p_notif_read_days integer default 90,
  p_notif_unread_days integer default 180,
  p_idempotency_days integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_read integer := 0;
  v_unread integer := 0;
  v_idem integer := 0;
begin
  if p_notif_read_days < 7 or p_notif_unread_days < 30 then
    raise exception 'retention_too_aggressive';
  end if;

  delete from public.activity_notifications
  where is_read = true
    and created_at < timezone('utc'::text, now()) - (p_notif_read_days || ' days')::interval;
  get diagnostics v_read = row_count;

  delete from public.activity_notifications
  where is_read = false
    and created_at < timezone('utc'::text, now()) - (p_notif_unread_days || ' days')::interval;
  get diagnostics v_unread = row_count;

  if to_regclass('public.reputation_idempotency') is not null then
    delete from public.reputation_idempotency
    where created_at < timezone('utc'::text, now()) - (p_idempotency_days || ' days')::interval;
    get diagnostics v_idem = row_count;
  end if;

  return jsonb_build_object(
    'deleted_read_notifs', v_read,
    'deleted_unread_notifs', v_unread,
    'deleted_idempotency', v_idem,
    'ran_at', timezone('utc'::text, now())
  );
end;
$$;

-- Exécutable service_role / dashboard SQL (pas authenticated abusif)
revoke all on function public.purge_retention(integer, integer, integer) from public;
grant execute on function public.purge_retention(integer, integer, integer) to service_role;

-- Exemple cron (à activer dans Dashboard si pg_cron dispo) :
-- select cron.schedule('pih-purge-retention', '0 3 * * 0', $$select public.purge_retention();$$);

comment on function public.purge_retention is
  'S2 retention PIH Pulse — run weekly via SQL Editor or pg_cron';

notify pgrst, 'reload schema';
