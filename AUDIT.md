# Audit complet PIH Pulse — Suivi progressif

> **Dernière mise à jour :** 2026-07-16 (fin de session)  
> **Branche :** `ben2beyond`  
> **Stack :** Expo Router 57 · React Native · NativeWind v4 · Supabase · TypeScript  
> **Charte :** Premium Turmeric & Malt (3 thèmes)

Source de vérité pour l’état produit. Cocher les items au fil de l’eau ; voir aussi [`SHIP.md`](./SHIP.md) pour le go store.

---

## 0. État des lieux — fin de session

### Verdict

**PIH Pulse est feature-complete pour une V1 hub interne.**  
Les sprints **A → E** + lots **médias**, **posts caption**, **notifs/chat** et **seeds** sont livrés côté code.

| Axe | Score | Note |
|-----|-------|------|
| Auth / onboarding / session | **90 %** | Stay logged-in OK ; Apple code OK (config store) |
| Feed hub | **90 %** | Pagination, batch réactions, Pour moi, events, media cover |
| Projets / missions | **90 %** | Loop métier, deadline, location/rôles, empty/skeleton |
| Talents | **85 %** | Annuaire + Contacter DM (pas « équipes projet ») |
| Profil | **95 %** | Public, toggles, présence, QR local, delete account |
| Posts | **95 %** | Caption unique + médias ; create/edit simplifiés |
| Chat | **90 %** | DM + projet ; notifs membres ; unread badges |
| Notifs | **90 %** | Types complets, realtime, throttle, batch push |
| Impact | **95 %** | Barème + niveaux + bonus |
| Media UX | **90 %** | Cover 4:5, thumbs vidéo, dots, lightbox |
| **Store / ops** | **45 %** | EAS + privacy + smoke device = **prochaine étape** |

### Fait dans cette session (résumé)

1. **Sprint A–E** : P0/P1/P2 backlog (listes, data honesty, feed, collab, polish store-ready code)  
2. **Session auth** : audit — rester connecté (recommandé)  
3. **Posts** : un seul champ **caption** (+ médias + projet?)  
4. **Médias** : cover Instagram, ratios 0.5–2.5, video thumb, carousel + lightbox  
5. **Notifs** : pipeline scalable, réactions notifiées, chat projet notifié, realtime badges  
6. **Seeds** : `supabase_seeds_posts.sql` (UUID hex valides `f…` / `fa…`)  
7. **Bugs** : nested `<button>` web, channels realtime « after subscribe »

### Prochaine session (recommandé)

1. **Ops SQL** (si pas fait) : `FIX_NOTIFICATIONS_SCALE.sql` + Realtime tables  
2. **Smoke 2 comptes** : message + réaction → cloche  
3. **EAS preview** (suivre `SHIP.md`)  
4. Optionnel code : **édition projet** lead, AuthGuard global, Edge Function push  

---

## 1. Matrice des écrans (état actuel)

| Route | Statut | Notes |
|-------|--------|-------|
| `/` splash session | DONE | `getSession` → tabs / onboarding |
| `/onboarding` | DONE | Thèmes OK |
| `/login` `/register` | DONE | Method-first ; OAuth + Apple code ; `routeAfterAuth` |
| `/forgot-password` `/reset-password` | DONE | OTP recovery |
| `/verify-otp` | DONE | Resend + cooldown |
| `/profile-setup` | DONE | Rôle + skills + bio |
| Feed | DONE | Tout / Pour moi / Mes équipes ; page ; media cover |
| Projets | DONE | FlatList, skeleton, scale filter, Contacter N/A |
| Missions | DONE | Filtres statut + deadline |
| Talents | DONE | Annuaire ; Contacter DM ; nested button fixé |
| Profil | DONE | Toggles, présence, QR local, thèmes |
| `project/[id]` | DONE | Empty honnête ; invite accept ; **pas d’edit lead** |
| `project/create` | DONE | location + roles_needed + redirect |
| `mission/[id]` | DONE | Loop validation complète |
| `mission/create` | DONE | deadline + redirect |
| `post/*` | DONE | Caption only ; media cover/lightbox |
| `event/[id]` | DONE | Détail minimal |
| `chat/*` | DONE | DM + projet ; notifs |
| `notifications` | DONE | Realtime, types, deep links |
| `profile/*` | DONE | edit avatar, impact, portfolio, security delete, settings i18n |
| `+not-found` | DONE | Charte |
| `modal` | RETIRÉ | Legacy Expo |

---

## 2. Notifs & chat — état technique

| Élément | État |
|---------|------|
| `activity_notifications` | Insert client + RLS |
| Types | missions, projets, invites, messages, boosts, **réactions**, replies… |
| Throttle réactions | 1 / acteur×ref / heure |
| Push Expo | Batch ≤100 ; opt-out `push_enabled` |
| Realtime badges | Channel unique / mount (fix Strict Mode) |
| Chat DM | `notifyUser` + deep link `/chat/{sender}` |
| Chat projet | `notifyUser` tous les membres |
| Push web/simu | Non (in-app only) — normal |

**Ops :** Realtime publication `activity_notifications` + `messages` ; `FIX_NOTIFICATIONS_SCALE.sql`.

---

## 3. Médias posts

| Élément | État |
|---------|------|
| Upload | Images JPEG ≤1280 ; vidéos 60s / ~40 Mo |
| Storage | bucket `media/{userId}/` |
| Vidéo thumb | `expo-video-thumbnails` → `vthumb_*` |
| Feed display | `aspectMode=4:5` + `cover` |
| Détail | `adaptive` + cover + lightbox + dots |
| Form post | Caption + médias (max 4) + projet optionnel |

---

## 4. Session / sécurité (décision)

| Décision | Détail |
|----------|--------|
| **Stay logged-in** | Oui — `persistSession` + SecureStore + autoRefresh |
| **Pas de timeout idle** | Correct pour hub V1 |
| Logout | Manuel profil |
| Plus tard | AuthGuard global ; re-auth delete ; Edge push |

---

## 5. Backlog restant (hors store)

### P1 produit

- [x] Édition projet (lead) — `app/project/edit.tsx`  
- [x] AuthGuard — `useRequireAuth` + tabs / chat / notifs  
- [ ] Création événements hub (hors scope store)  
- [ ] Vue « Mes équipes » (squads) vs Talents  

### P2 polish

- [x] FlatList Projets / Missions (Feed = ScrollView + pagination)  
- [x] Pull-to-refresh profil  
- [ ] Avatars chat + membres projet  
- [ ] i18n branchée sur plus d’écrans  
- [x] Edge Function push (`send-push`)  

### Ops / store → **SHIP.md**

- [ ] Builds EAS preview (compte store non requis pour Android APK internal si Expo OK)  
- [ ] Smoke device réel  
- [x] Privacy policy **in-app** (`/legal/privacy`) — URL web stores plus tard  
- [ ] Apple / Google store accounts  

---

## 6. SQL & seeds à connaître

| Fichier | Rôle |
|---------|------|
| `supabase/FIX_NOTIFICATIONS_SCALE.sql` | Indexes notifs + realtime |
| `supabase/FIX_PROJECT_LOCATION_ROLES.sql` | location / roles_needed |
| `supabase/FIX_INVITES_DELETE_ACCOUNT.sql` | invites + delete account |
| `supabase_seeds.sql` | Users / projets / missions |
| `supabase_seeds_posts.sql` | **8 posts** + médias Unsplash + notifs démo (UUID `f…` / `fa…`) |

---

## 7. Libs & composants (aperçu)

| Surface | Statut |
|---------|--------|
| `lib/activity.ts` | DONE — notify + throttle + realtime helper |
| `lib/notifications.ts` | DONE — batch push |
| `lib/media.ts` | DONE — compress + video thumb |
| `lib/posts.ts` | DONE — caption only |
| `lib/presence.ts` | DONE |
| `lib/authOAuth.ts` | DONE — Google/GitHub/Apple |
| `MediaCarousel` | DONE — cover / lightbox / dots |
| `ReactionBar` | DONE — batch initial + stopPropagation |
| `CollapsibleHeader` | DONE — safe area |

---

## 8. Changelog audit

| Date | Action |
|------|--------|
| 2026-07-16 | Création audit + sprints A–E |
| 2026-07-16 | Médias Instagram-like + caption posts |
| 2026-07-16 | Notifs scale + chat projet notifs + seeds posts |
| 2026-07-16 | Fix UUID seeds ; fix realtime channels ; fix nested button web |
| 2026-07-16 | **Fin de session** — état des lieux consolidé |

---

## 9. Prochaine action recommandée

```
1. Vérifier Supabase Realtime (activity_notifications, messages)
2. Smoke 2 users : DM + réaction → cloche
3. npx eas build --profile preview --platform android|ios
4. Tester TestFlight / Play Internal (SHIP.md)
```

*Session clôturée. Reprendre via `AUDIT.md` + `SHIP.md`.*
