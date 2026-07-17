# Changelog — PIH Pulse

## 1.0.0 — 2026-07-17

### Scale & data
- Pagination listes (Projets, Missions, Feed) + indexes SQL
- Chat paginé + curseurs lecture projet
- Compteurs réactions/boosts dénormalisés (`engagement_counts`)
- Feed unifié `hub_feed` (ranking boost + date)
- RPC `award_points` renforcé + bulk notifs + Edge `send-push`
- Archive messages + purge notifs (cron si pg_cron)

### Produit
- Libellé **Élan** (ex-Impact)
- Édition projet lead
- AuthGuard onglets + notifs/chat
- Politique confidentialité in-app
- Pull-to-refresh profil
- Re-auth mot de passe à la suppression de compte

### Docs / tooling
- `SCALE_AUDIT.md`, `docs/SCALE_S2_OPS.md`, k6 `scripts/load-test/feed-k6.js`
- `.env.example`
