# Audit scalabilité — PIH Pulse (cible 100k users)

> **Date :** 2026-07-17  
> **Branche auditée :** `ben2beyond` / `main` @ V1 hub  
> **Objectif déclaré :** 100 000 utilisateurs **sans douleur DB**  
> **Périmètre :** schéma Supabase, RLS, indexes, patterns de requêtes client, realtime, push, chat, réactions, storage  
> **Méthode :** revue statique du code + SQL (pas de load test live)

---

## Verdict honnête (TL;DR) — **re-audit 2026-07-17 (post S0–S2)**

| Question | Réponse |
|----------|---------|
| **Prêt pour hub réel (≈ 1–10k users, centaines d’actifs) ?** | **Oui** — pagination, indexes, points RPC, push edge, chat cursors, compteurs. |
| **Prêt pour 100k users “sans souci” aujourd’hui ?** | **Presque pour la DB de lecture** ; **pas encore pour tout le cycle de vie** (messages illimités, load test non run, plan Supabase non validé sous charge, RLS lecture large). |
| **PostgreSQL / Supabase peut-il tenir 100k ?** | **Oui** sur le chemin actuel, avec plan Pro+, cron rétention, et surveillance. |
| **Score global scalabilité** | **~86 / 100** (S3 hardening inclus : feed unifié, award, archive, bulk notifs) |

### Phrase unique

> **PIH Pulse est passé d’un MVP “listes non bornées + points client” à une V1 hub scale-aware. Les P0 d’audit sont traités. Il reste de l’ops (cron, load test, commit git) et de la dette fine (archivage messages, feed unifié, hardening award_points).**

---

## 1. Ce que “100k users” veut vraiment dire

| Métrique | Hypothèse réaliste | Implication |
|----------|-------------------|-------------|
| Users inscrits | 100 000 | OK pour Postgres (lignes `profiles`) |
| DAU (actifs / jour) | 5–15 % → **5k–15k** | Charge réelle |
| Concurrent (pics) | 1–3 % DAU → **50–450** | Realtime + API |
| Contenu | 10k–50k posts/projets/missions | Indexes + pagination **obligatoires** |
| Messages | millions de lignes | Pagination + partition/archivage |
| Notifs | dizaines de millions si non purgées | TTL + indexes partiels |

**Postgres gère 100k rows facilement.**  
Le risque est **N requêtes × payload × realtime × writes non sécurisées**, pas “100k UUID dans profiles”.

---

## 2. Matrice par sous-système

| Sous-système | Score | État | Bloquant 100k ? |
|--------------|-------|------|-----------------|
| Schéma relationnel de base | 70 | Clair, UUID, FKs | Non |
| Indexes | 45 | Bons sur réactions/posts/notifs ; **trous** projets/missions/messages/membres | Oui |
| RLS | 40 | Ouvert en lecture ; **insert réputation non borné** | Oui (sécurité + load) |
| Feed | 50 | Limits 40 partiels ; **boosts full scan** | Oui |
| Listes Projets / Missions | 25 | **Sans `.limit()`** + join `project_members` | **Oui** |
| Talents | 65 | `.limit(80)` | Non |
| Réactions | 60 | Batch listes OK ; compteurs non dénormalisés | Moyen |
| Notifs in-app | 65 | Indexes scale + throttle + head count | Moyen |
| Push | 35 | Batch Expo OK, **depuis le client** | **Oui** |
| Chat DM | 45 | Historique non paginé | Oui |
| Chat projet | 20 | `is_read` global partagé = modèle faux | **Oui** |
| Realtime | 40 | Filtré user OK ; 2 channels/user en pic | Moyen |
| Reputation / Élan | 30 | Client insert + trigger ; RLS insert any auth | **Oui** |
| Storage médias | 55 | Compress client ; pas de lifecycle serveur | Moyen |
| Ops (monitoring, quota) | 20 | Peu de garde-fous documentés | Oui à l’échelle |

---

## 3. Findings critiques (P0) — bloquants 100k

### P0.1 — Listes Projets / Missions non bornées

**Code :** `app/(tabs)/projects.tsx`, `app/(tabs)/missions.tsx`

```ts
// projects — PAS de .limit()
.from('projects')
.select(`..., project_members(user_id)`)
.order('created_at', { ascending: false })

// missions — PAS de .limit()
.from('missions')
.select(`...`)
.order('created_at', { ascending: false })
```

**Impact 100k :**
- PostgREST renvoie jusqu’à la limite max (souvent 1000) ou timeout.
- Join embarqué `project_members` → explosion de payload (1 projet × N membres).
- Chaque ouverture d’onglet = scan tri + join lourd.

**Fix :**
- `.limit(30)` + cursor `created_at` / `id`
- Compteur membres via `count` head ou colonne dénormalisée `member_count`
- FlatList + `onEndReached`

---

### P0.2 — Feed charge **toute** la table `boosts`

**Code :** `app/(tabs)/index.tsx`

```ts
supabase.from('boosts').select('ref_id, ref_type')  // full table
```

**Impact :** à 1M boosts, chaque refresh feed tire la table entière en RAM client + bande passante.

**Fix :**
- Compteur `boost_count` sur `posts` / `projects` / `missions` (trigger)
- Ou RPC SQL : boosts agrégés **uniquement** pour les `ref_id` du page feed
- Ou `fetchReactionsBatch` déjà existant pour les items visibles seulement

---

### P0.3 — Chat : historique non paginé + modèle `is_read` projet cassé

**Code :** `app/chat/[id].tsx`

```ts
// charge TOUT l’historique
.order('created_at', { ascending: true })  // pas de limit

// marque lus pour TOUT LE MONDE
.update({ is_read: true })
.eq('project_id', projectId)
.neq('sender_id', user.id)
```

**Problèmes :**
1. Threads longs → payloads monstrueux, mémoire mobile.
2. **Un seul booléen `is_read` partagé** : le premier lecteur “lit pour les autres”. Compteurs badge projet **incorrects** dès 2 membres.
3. RLS messages avec `EXISTS project_members` sur chaque row → coûteux sans index `(project_id, created_at)`.

**Fix modèle (nécessaire avant 10k users chat actifs) :**
- Table `message_reads (message_id, user_id, read_at)` **ou** `last_read_at` par `(user_id, thread_id)`
- Messages : `.order(created_at desc).limit(50)` + scroll up pour older
- Index `messages (project_id, created_at desc)`, `messages (receiver_id, created_at desc)` pour DM

---

### P0.4 — Réputation / Élan : écriture client + RLS ouverte

**Schéma :**

```sql
-- n'importe quel user authentifié peut insérer n'importe quel log
create policy "Authenticated can insert reputation logs."
  on reputation_logs for insert
  with check (auth.role() = 'authenticated');
```

**Code :** inserts directs depuis `lib/hub.ts`, `lib/reactions.ts`, `lib/posts.ts`, etc.

**Impact :**
- **Sécurité :** inflation de points triviale (cheat).
- **Scale :** logique métier dispersée, pas de transaction atomique award + anti-doublon serveur.
- Trigger `update_profile_reputation` OK, mais **source non fiable**.

**Fix :**
- `SECURITY DEFINER` RPC uniquement (`award_points(user_id, amount, reason, idempotency_key)`)
- RLS insert **deny** pour `authenticated` (seul `service_role` / fonction)
- Table d’idempotence déjà partiellement là (`reaction_awards`, `reply_awards`) → généraliser

---

### P0.5 — Push Expo depuis le **client**

**Code :** `lib/activity.ts` → `sendPushBatch` → `https://exp.host/--/api/v2/push/send`

**Problèmes à 100k :**
- Chaque device envoie le push d’un autre user (latence, échecs offline, rate limit).
- Clés / quotas Expo non centralisés.
- Fan-out projet (`notifyMany` = N × insert + N × fetch profile + N × push) **depuis le téléphone de l’émetteur**.

**Fix :**
- Edge Function (ou worker) : client écrit **seulement** `activity_notifications`
- Trigger / queue (`pg_net`, QStash, Inngest, Supabase Queue) envoie le push
- `notifyMany` = **1 insert multi-rows** + 1 job batch

---

## 4. Findings majeurs (P1)

### P1.1 — Indexes manquants (trou évident)

**Présents (bien) :**  
`reactions`, `boosts`, `posts(created_at)`, `replies(ref…)`, notifs (migration scale), messages unread partiel.

**Absents / incomplets dans le schéma consolidé :**

| Index recommandé | Pourquoi |
|------------------|----------|
| `projects (created_at desc)` | Listes + feed |
| `projects (creator_id)` | Profils / “mes projets” |
| `projects (status, created_at desc)` | Filtres |
| `missions (created_at desc)` | Liste |
| `missions (status, created_at desc)` | Filtres open |
| `missions (project_id)` | Fiche projet |
| `project_members (user_id)` | Memberships feed / badges |
| `project_members (project_id)` | (souvent couvert par unique) |
| `messages (project_id, created_at desc)` | Chat projet paginé |
| `messages (receiver_id, created_at desc)` | DM |
| `messages (sender_id, receiver_id, created_at desc)` | Thread DM |
| `reputation_logs (user_id, created_at desc)` | Historique Élan |
| `activity_notifications (user_id, created_at desc)` | Inbox (en plus du partial unread) |

Sans ces indexes, à volume moyen les listes passent en **seq scan**.

---

### P1.2 — Compteurs réactions non dénormalisés

`fetchReactions` charge **toutes** les rows `type` pour un ref et compte en JS.  
Batch listes OK pour une page, mais un post viral (10k réactions) = 10k rows par refresh.

**Fix :** colonnes `reaction_hot`, `reaction_idea`, … ou table `reaction_counts` maintenue par trigger ; client ne fetch que “mon état” (4 rows max).

---

### P1.3 — `notifyMany` = N appels `notifyUser`

```ts
await Promise.all(unique.map((userId) => notifyUser({...})))
```

Pour un chat projet de 50 membres : 50 inserts + 50 selects profile + jusqu’à 50 HTTP Expo **depuis 1 client**.

**Fix :** bulk insert + job push serveur.

---

### P1.4 — Realtime × concurrent users

Chaque session active :
- 1 channel notifs (`user_id` filter) — bon design
- 1 channel messages badge
- + 1 channel par room chat ouverte

**Limites Supabase Realtime** (connexions concurrentes selon plan) :  
100k **inscrits** ≠ 100k sockets. Si 2 000 online avec 2 channels = 4 000 connexions → plan + design (désabonner en background, poll badges ok).

Le poll 60s de secours dans `useUnreadBadges` est **sain**.

---

### P1.5 — RLS `SELECT using (true)` partout

Acceptable pour un hub public.  
À l’échelle : chaque query authentifiée évalue encore les policies ; les policies **messages** avec `EXISTS` sont les plus chères.

**Fix messages :**  
- policy simplifiée + indexes  
- ou vue matérialisée / RPC `get_thread(thread_id, cursor)`

---

### P1.6 — Pas de rétention / archivage

| Table | Risque croissance |
|-------|-------------------|
| `activity_notifications` | Très haut |
| `messages` | Très haut |
| `reputation_logs` | Haut |
| `reactions` / `boosts` | Haut |

Sans purge (ex. notifs lues > 90 j, soft soft-delete), la DB grossit linéairement avec l’activité, pas avec les users.

---

### P1.7 — Storage

- Upload compressé côté client (bien).
- Pas de lifecycle (suppression orphelins, virus scan, quota user).
- URLs publiques OK pour hub ; CDN Supabase tient, mais **pas de budget storage** codé.

---

## 5. Ce qui est **déjà bien** pour scaler (à garder)

1. **Batch réactions** `fetchReactionsBatch` — bon réflexe listes.  
2. **Notifs** : count `head: true`, throttle 1/h réactions, indexes scale documentés.  
3. **Realtime notifs filtrée** `user_id=eq.…` (pas de broadcast global).  
4. **Push batch ≤100** déjà chunké.  
5. **Idempotence partielle** : `reaction_awards`, `reply_awards`, `project_status_rewards`.  
6. **Feed posts** : `.limit(40)` + pagination visuelle `visibleCount`.  
7. **Talents** : `.limit(80)`.  
8. **UUID + FKs cascade** — modèle propre.  
9. **Conscience scale** dans les commentaires (`lib/activity.ts`, FIX_NOTIFICATIONS_SCALE) — la direction est bonne, l’implémentation incomplète.

---

## 6. Estimation de capacité (ordre de grandeur)

| Étape | Users inscrits | DAU | Verdict architecture actuelle |
|-------|----------------|-----|-------------------------------|
| Aujourd’hui (code) | 0–500 | <50 | Confortable si FIX indexes notifs appliqués |
| Soft launch | 1–3 000 | 100–400 | OK après **P0.1 pagination listes** |
| Traction | 10–20 k | 1–3 k | **P0 chat + push edge + indexes** obligatoires |
| Objectif | **100 k** | 5–15 k | **Tous P0 + P1 compteurs + rétention + plan Supabase Pro/Team** |

> 100k users “sans souci DB” = **faisable**, mais c’est un **projet d’architecture**, pas un réglage d’index seul.

---

## 7. Roadmap scale (priorisée)

### Sprint S0 — “Ne pas mourir à 2 000 users” (1–3 j)

| # | Action | Effort |
|---|--------|--------|
| 1 | `.limit` + pagination Projets / Missions / Feed | S |
| 2 | Migration indexes manquants (section 4.1) | S |
| 3 | Stop full scan `boosts` (batch sur ids feed only) | S |
| 4 | Chat messages `.limit(50)` + load older | M |
| 5 | Appliquer `FIX_NOTIFICATIONS_SCALE.sql` en prod si pas fait | S |

### Sprint S1 — “Fiable à 20 k” (1–2 sem)

| # | Action | Effort |
|---|--------|--------|
| 6 | RPC `award_points` + fermer insert `reputation_logs` | M |
| 7 | Edge Function push (client n’appelle plus Expo) | M |
| 8 | `notifyMany` bulk insert | M |
| 9 | Modèle read receipts chat projet (`last_read_at` / `message_reads`) | L |
| 10 | Compteurs réactions/boosts dénormalisés (triggers) | M |

### Sprint S2 — “Chemin 100k” (ongoing)

| # | Action | Effort |
|---|--------|--------|
| 11 | Rétention notifs (job nightly) | S |
| 12 | Partition ou archivage messages anciens | L |
| 13 | Observabilité : slow queries Supabase, dashboards | M |
| 14 | Rate limiting (Edge) sur réactions / messages / posts | M |
| 15 | Plan Supabase adapté (connexions, disk, compute) + read replica si besoin | Ops |
| 16 | Load test k6 : feed, listes, chat, notifs | M |

---

## 8. Migration SQL proposée (S0 indexes)

À valider puis coller en SQL Editor / migration :

```sql
-- Listes & feed
create index if not exists idx_projects_created on public.projects (created_at desc);
create index if not exists idx_projects_creator on public.projects (creator_id);
create index if not exists idx_projects_status_created on public.projects (status, created_at desc);

create index if not exists idx_missions_created on public.missions (created_at desc);
create index if not exists idx_missions_status_created on public.missions (status, created_at desc);
create index if not exists idx_missions_project on public.missions (project_id);

create index if not exists idx_project_members_user on public.project_members (user_id);
create index if not exists idx_project_members_project on public.project_members (project_id);

-- Chat
create index if not exists idx_messages_project_created
  on public.messages (project_id, created_at desc)
  where project_id is not null;
create index if not exists idx_messages_dm_created
  on public.messages (receiver_id, created_at desc)
  where project_id is null;
create index if not exists idx_messages_sender_receiver
  on public.messages (sender_id, receiver_id, created_at desc)
  where project_id is null;

-- Élan / notifs
create index if not exists idx_reputation_logs_user_created
  on public.reputation_logs (user_id, created_at desc);
create index if not exists idx_activity_notifications_user_created
  on public.activity_notifications (user_id, created_at desc);
```

*(Complète, ne remplace pas `FIX_NOTIFICATIONS_SCALE.sql`.)*

---

## 9. Anti-patterns à ne plus introduire

1. `select *` / `select` sans `limit` sur tables croissantes.  
2. Joins embarqués 1-N pour **compter** (`project_members(user_id)` sur une liste).  
3. Full table pour agrégats (`boosts` entier).  
4. Métier monétaire / points **uniquement** côté client.  
5. Fan-out push depuis le device de l’utilisateur.  
6. Un booléen `is_read` pour un thread multi-users.  
7. Realtime sans cleanup de channels (fuite connexions).

---

## 10. Verdict final

| | |
|--|--|
| **Produit** | V1 hub **feature-complete** — bon pour usage réel limité |
| **DB core** | Structure saine ; **indexes incomplets** ; **pas de bornes** sur listes chaudes |
| **Sécurité scale** | Réputation et push sont des **dettes structurelles** |
| **100k sans souci** | **Non aujourd’hui** — **oui après S0+S1+S2** |
| **Priorité immédiate** | Pagination + indexes + arrêter le full scan boosts |

### Note de franchise

L’équipe a **déjà anticipé** le scale (notifs, batch réactions, commentaires 100k).  
Ce n’est pas un projet “naïf”.  
Mais l’objectif “100k users sans souci de DB” **n’est pas encore vrai** : plusieurs chemins chauds (listes, boosts, chat, points, push) se comportent encore en **MVP mono-client**.

**Prochaine action recommandée :** implémenter le **Sprint S0** (indexes + pagination + boosts) — ROI max, risque bas.

---

## 11. Checklist de suivi

- [x] **S0.1** Pagination Projets / Missions / Feed (2026-07-17)
  - Projets : FlatList + `.range` + filtre/statut/recherche serveur + `project_members(count)`
  - Missions : FlatList + `.range` + statut/recherche serveur
  - Feed : pages sources `FEED_SOURCE_PAGE` + load more serveur + slice UI
- [x] **S0.2** Migration indexes scale — `20260717000000_scale_s0_indexes.sql` + `FIX_SCALE_S0.sql`
- [x] **S0.3** Boosts par page — plus de `select` full table ; batch `.in(ref_id)` via `fetchReactionsBatch`
- [x] **S0.4** Messages paginés — `lib/messages.ts` + chat DM/projet (40/page, load older)
- [x] **S0.5** Scripts prod prêts — coller **`supabase/FIX_PROD_SCALE.sql`** dans SQL Editor (notifs + S0 indexes + realtime)
- [x] **S1** RPC `award_points` + RLS fermé — `FIX_AWARD_POINTS.sql` + `lib/reputation.ts` `awardPoints()`
- [x] **S1** Edge push — `supabase/functions/send-push` + `lib/activity.ts` (fallback client si non déployée)
- [x] **S1** Read model chat projet — `chat_read_cursors` + RPC `mark_project_chat_read` / counts
- [x] **S1** Compteurs dénormalisés — `engagement_counts` + triggers reactions/boosts
- [x] **S2** Rétention `purge_retention` + doc load test / plan — `docs/SCALE_S2_OPS.md`
- [x] **Produit** UI **Élan** (ex-Impact) sur toute l’app

### Ops manuelle (prod)

1. [x] SQL Editor → **`FIX_PROD_SCALE.sql`** (fait)
2. [x] SQL Editor → **`FIX_AWARD_POINTS.sql`** (fait)
3. [x] `npx supabase functions deploy send-push` (projet `szmzhchyubbpocbgqoly`, fait)
4. [x] SQL Editor → **`FIX_CHAT_READ_AND_COUNTS.sql`** — fait  
5. [x] SQL Editor → **`FIX_SCALE_HARDENING.sql`** (S3) — fait

**Dernière mise à jour :** 2026-07-17 — **S0–S3 scale complete** (code + prod SQL + edge + push git)
```
