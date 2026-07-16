# Supabase — PIH Pulse

## Source de vérité

**`supabase_schema.sql`** (racine du dépôt) est le **schéma complet et à jour**.

Utilise-le pour :
- initialiser une nouvelle base (SQL Editor Supabase → coller le fichier) ;
- documenter l’état attendu des tables, RLS et triggers.

## Migrations

Le dossier `migrations/` conserve l’**historique incrémental** appliqué sur des bases déjà en prod :

| Fichier | Contenu |
|---------|---------|
| `20260708000000_group_chat.sql` | Chat de groupe (`project_id` sur messages) |
| `20260708000001_add_push_tokens.sql` | `profiles.expo_push_token` |
| `20260715000000_reactions_and_boosts.sql` | Tables `reactions` + `boosts` |
| `20260715000001_mission_lead_policies.sql` | RLS claim mission + leads + reputation insert |
| `20260715000002_hub_loop_activity_feed.sql` | Livrables, review, activity_notifications, hub_events |
| `20260715000003_media_portfolio_storage.sql` | portfolio, media JSON, buckets avatars/media + RLS |
| `20260715000004_profile_phone.sql` | phone sur profiles |
| `20260716000000_impact_reactions.sql` | reaction_awards, status rewards, impact_profile_bonus |
| `20260716000001_hub_posts.sql` | Table `posts` + `ref_type` post sur reactions/boosts/awards |
| `20260716000002_replies.sql` | Réponses/threads/mentions/pin + reply_awards (Impact feedback) |
| `20260716000003_profile_prefs.sql` | available_for_missions, preferred_locale, push_enabled |
| `20260716000004_profile_toggles.sql` | show_online_presence, reminders_enabled, last_seen_at |
| `20260716000005_project_location_roles.sql` | projects.location, projects.roles_needed |
| `20260716000006_project_invites_delete_account.sql` | project_invites + RPC delete_own_account |
| `20260716000007_notifications_scale.sql` | indexes notifs/messages + realtime publication |

### Seeds

| Fichier | Contenu |
|---------|---------|
| `supabase_seeds.sql` (racine) | Users, projets, missions |
| `supabase_seeds_posts.sql` (racine) | Posts + médias Unsplash + notifs + réactions |

**Ordre :** seeds de base → `supabase_seeds_posts.sql`.  
**UUID posts :** `f1111111-…` … `f8888888-…` (hex uniquement — pas de préfixe `p`/`n`).

Si ta base a déjà été créée avec un ancien `supabase_schema.sql`, applique seulement les migrations manquantes (dans l’ordre).

Si tu repartes de zéro, applique uniquement **`supabase_schema.sql`** (il inclut tout).

## Fix rapide (prod déjà en place)

Si le hub affiche des erreurs « column/table missing » ou présence / posts / replies cassés :

1. Ouvre **Supabase → SQL Editor**
2. Colle et exécute **`FIX_SPRINT_A_OPS.sql`** (idempotent)
3. Vérifie le résultat diagnostic (posts, replies, colonnes profil)

Fichiers unitaires (si besoin partiel) : `FIX_POSTS_NOW.sql`, `FIX_REPLIES_NOW.sql`, `FIX_PROFILE_PREFS.sql`, `FIX_PROFILE_TOGGLES.sql`, `FIX_PROJECT_LOCATION_ROLES.sql`, `FIX_INVITES_DELETE_ACCOUNT.sql`, `FIX_NOTIFICATIONS_SCALE.sql`.
