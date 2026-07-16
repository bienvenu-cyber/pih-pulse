# Corrections & Améliorations — PIH Pulse

Fichier de suivi des bugs et améliorations identifiés lors de l'audit du 15 Juillet 2026.

---

## 🔴 Critiques (Bloquants en production)

- [x] **HTML natif dans login.tsx & register.tsx** — Remplacer les `<div>` / `<span>` du séparateur "Ou continuer avec" par des composants React Native (`View`, `Text`)
- [x] **Imports manquants dans `mission/[id].tsx`** — Ajouter les imports React et React Native manquants (`useState`, `useEffect`, `View`, `Text`, etc.)
- [x] **OAuth social login factice** — Connecter Google/GitHub/Apple via Supabase OAuth réel (en attente de la config Google Cloud de ton côté)
- [x] **Réputation non synchronisée** — Mettre à jour `reputation_points` dans `profiles` lors de chaque gain de points (en plus du `reputation_logs`)
- [x] **Splash screen blanc** — Changer `backgroundColor` dans `app.json` de `#ffffff` à `#0D0B05`

---

## 🟡 Modérés (UX dégradée)

- [x] **`bg-malt-hover` inexistant** — Supprimer ou remplacer cette classe non déclarée dans `tailwind.config.js` (boutons sociaux login/register)
- [x] **CollapsibleHeader — crash web** — Ajouter vérification `Platform.OS` avant `SecureStore.getItemAsync`
- [x] **Pas de listener `onAuthStateChange`** — Ajouter dans `_layout.tsx` pour rediriger vers `/login` si session expirée
- [x] **`mission/create.tsx` — accès non restreint** — Vérifier que l'utilisateur est membre (Founder/Lead) du projet avant de permettre la création d'une mission
- [x] **`app.json` — nom avec tiret** — Changer `"name": "PIH-PULSE"` en `"name": "PIH Pulse"`

---

## 🔵 Améliorations (V1.1)

- [x] **Système de niveaux** — Calculer et afficher le niveau (Spark → Founder) + barre de progression dans le profil
- [x] **Badges** — Implémenter les 6 badges du PRD (First Launch, On Fire, BrickLayer, etc.)
- [x] **Pull-to-refresh** — Ajouter `refreshControl` sur le Feed (+ pagination « Charger plus »)
- [x] **Guards sur routes protégées** — Protéger `/project/create` et `/mission/create` contre les accès non authentifiés
- [x] **Clarifier source de vérité DB** — `supabase_schema.sql` = source unique ; `migrations/` = historique
- [x] **Validation mission par le lead** — CTA « Valider la mission » + attribution points_reward + bonus 20 pts
- [x] **Reset mot de passe OTP** — `/forgot-password` + `/reset-password` (code recovery Supabase, pas de lien requis côté app)

---

## ✅ Déjà OK (pour référence)

- Architecture / Navigation Expo Router
- UI / Charte Graphique "Turmeric & Malt"
- Auth email + OTP
- Données dynamiques Supabase (Feed, Projets, Missions, Équipes, Profil)
- Chat Realtime 1-to-1 et groupe projet
- Push Notifications
