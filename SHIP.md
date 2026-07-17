# Ship / Store — PIH Pulse

Checklist pour passer du MVP à un usage réel (TestFlight / Play Internal → stores).

Dernière mise à jour : 2026-07-17 (scale S0–S3 + code ship-ready hors comptes stores).

**Contexte :** code hub + scale **DONE**. Ce fichier = ce qui reste **quand tu as les comptes stores** + smoke device.

---

## 1. Prérequis comptes

- [ ] Compte Expo / EAS (`npx eas login`) — projectId dans `app.json` → `extra.eas.projectId`
- [ ] Apple Developer Program (iOS) + App Store Connect app créée
- [ ] Google Play Console (Android) + app créée
- [ ] Secrets **hors git** (ne pas committer `OAUTH_CONFIG.md` / service accounts)

## 2. Supabase prod

- [ ] Migrations appliquées (voir `supabase/README.md`)
- [ ] FIX récents si base déjà en place :
  - [ ] `FIX_SPRINT_A_OPS.sql` (posts, replies, toggles)
  - [ ] `FIX_PROJECT_LOCATION_ROLES.sql` (location, roles_needed)
  - [ ] `FIX_INVITES_DELETE_ACCOUNT.sql` (invites + delete account)
  - [ ] `FIX_NOTIFICATIONS_SCALE.sql` (indexes + realtime notifs/messages)
- [ ] Realtime : tables `activity_notifications` + `messages` dans la publication
- [ ] Seeds démo (optionnel) : `supabase_seeds.sql` puis `supabase_seeds_posts.sql`
- [ ] Buckets Storage `avatars` + `media` + policies
- [ ] Auth providers activés : Email, Google, GitHub, **Apple**
- [ ] Redirect URIs OAuth prod :
  - `pihpulse://auth/callback`
  - URLs Expo / site web si applicable
- [ ] Templates e-mail OTP (signup + recovery) en français
- [ ] RLS vérifiées (profiles, projects, missions, messages, posts, replies)

## 3. OAuth / Apple

| Provider | Config | Notes |
|----------|--------|--------|
| Google | Supabase + client IDs Android/iOS/Web | Redirect scheme `pihpulse` |
| GitHub | Supabase OAuth | — |
| Apple | Supabase Apple + **Sign in with Apple** capability | iOS natif via `expo-apple-authentication` ; web/Android OAuth browser |
| Apple App ID | Capability « Sign in with Apple » | `app.json` → `ios.usesAppleSignIn: true` |

## 4. Builds EAS

```bash
# Preview interne
npx eas build --profile preview --platform android
npx eas build --profile preview --platform ios

# Production store
npx eas build --profile production --platform all
```

```bash
# Soumission
npx eas submit --profile production --platform android
npx eas submit --profile production --platform ios
```

- [ ] `eas.json` submit iOS : `appleId`, `ascAppId`, `appleTeamId` renseignés
- [ ] Android service account JSON dans `secrets/` (gitignore)

## 5. Smoke tests avant submit

1. [ ] Auth e-mail + OTP signup + reset password  
2. [ ] OAuth Google (device réel)  
3. [ ] Apple Sign-In (iOS device)  
4. [ ] Upload avatar + médias post (cover feed + lightbox)  
5. [ ] Feed : pagination, Pour moi, seeds posts visibles  
6. [ ] Créer projet (location/rôles) → fiche  
7. [ ] Créer mission (deadline) → candidature → validation  
8. [ ] Invite projet → accepter sur fiche  
9. [ ] Chat DM : message → notif in-app destinataire → deep link  
10. [ ] Réaction sur post d’un autre → notif créateur  
11. [ ] Chat projet → notif membres  
12. [ ] Push tap → deep link (device physique)  
13. [ ] Thèmes Malt / OLED / Light  
14. [ ] Présence « En ligne » (toggle + public)  
15. [ ] QR profil offline  
16. [ ] Suppression de compte (Security)  


## 6. Stores

| Plateforme | Package | Notes |
|------------|---------|--------|
| Android | `com.ben229.PIHPULSE` | AAB production, track **internal** d’abord |
| iOS | `com.ben229.PIHPULSE` | TestFlight avant App Store |

### Privacy labels (à publier)

- **Photos** : profil + médias projets/missions  
- **Push** : alertes hub  
- **Données** : Supabase (région configurée)  
- **Identifiants** : e-mail, nom, skills (profil)  

### Privacy policy URL

- [x] **In-app** : route `/legal/privacy` (Profil → Préférences → Confidentialité)  
- [ ] Page web publique (Notion/site) pour les formulaires stores  
- [ ] Lien stores → URL web  

## 7. Versioning

- `app.json` → `version` **1.0.0**  
- EAS `autoIncrement` → build number (production)  
- [x] Changelog : `CHANGELOG.md`  
- [ ] Release notes stores FR (copier depuis CHANGELOG)  

## 8. Post-ship monitoring

- [ ] Crash reporting (Sentry ou Expo) — optionnel V1.1  
- [ ] Supabase logs / rate limits  
- [ ] Feedback communauté PIH  

---

## État code (2026-07-17)

| Zone | Statut |
|------|--------|
| Hub + scale S0–S3 | **DONE** (prod SQL + edge + git) |
| AuthGuard tabs / chat / notifs | **DONE** |
| Édition projet lead | **DONE** |
| Privacy in-app | **DONE** `/legal/privacy` |
| Élan UI | **DONE** |
| **Reste sans comptes stores** | Smoke manuel + éventuellement `eas build --profile preview --platform android` |
| **Reste avec comptes stores** | Submit iOS/Android, privacy URL web, OAuth Apple store |

Détail : **`AUDIT.md`**, scale : **`SCALE_AUDIT.md`**.
