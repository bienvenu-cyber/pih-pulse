# Scale ops — PIH Pulse (S2 + S3)

## 1. Appliquer le lot hardening (prod)

SQL Editor → coller **`supabase/FIX_SCALE_HARDENING.sql`** → Run  

Inclut :
- Cron `purge_retention` + `archive_old_messages` (si **pg_cron** activé)
- Table `messages_archive`
- Helper RLS `is_project_member` + policies messages allégées
- Table **`hub_feed`** unifiée + triggers + backfill
- **`award_points` renforcé** (clé obligatoire, whitelist préfixes, caps)
- RPC **`notify_many_users`** (bulk notifs)

### Activer pg_cron (Dashboard)

1. Database → **Extensions** → activer `pg_cron`  
2. Re-run le FIX (ou les blocs `cron.schedule`)  
3. Vérifier :

```sql
select * from cron.job;
```

Jobs attendus :
- `pih-purge-retention` — dimanche 03:00 UTC  
- `pih-archive-messages` — dimanche 03:30 UTC  

Sans pg_cron :

```sql
select public.purge_retention(90, 180, 90);
select public.archive_old_messages(365, 100);
```

---

## 2. Rétention notifs

```sql
select public.purge_retention(90, 180, 90);
```

| Param | Défaut | Effet |
|-------|--------|--------|
| notifs lues | 90 j | delete |
| notifs non lues | 180 j | delete |
| clés idempotency | 90 j | delete |

---

## 3. Archive messages

```sql
select public.archive_old_messages(365, 100);
```

- Projet : > 365 j **et** hors des 100 plus récents → archive  
- DM : > 365 j → archive  

---

## 4. award_points anti-farm

Clé **obligatoire**, préfixe whitelist (`reaction`, `create_post`, `mission_reward`, …).  
Limites : 80 awards/h, 800 pts/jour par `awarded_by`.  
Points plafonnés par type d’action (catalogue dans la RPC).

---

## 5. Load test (k6)

```bash
export SUPABASE_URL="https://szmzhchyubbpocbgqoly.supabase.co"
export SUPABASE_ANON_KEY="<anon key>"
k6 run scripts/load-test/feed-k6.js
```

Seuils : p95 feed < 800 ms, errors < 1 %.

---

## 6. Plan Supabase + metrics

| Charge | Plan | Notes |
|--------|------|-------|
| < 2k | Free/Pro | OK S0–S3 |
| 2–20k | **Pro** | pg_cron, disk |
| 20–100k | Pro compute / Team | Realtime, replicas |

Dashboard hebdo : Query performance, connections, Realtime, Edge `send-push`, Storage.

---

## 7. Checklist

- [ ] `FIX_SCALE_HARDENING.sql` exécuté  
- [ ] `cron.job` OK ou purge manuelle  
- [ ] `select count(*) from hub_feed` > 0  
- [ ] k6 smoke  
- [ ] Plan Supabase revu  
