# Plan d'Exécution & Progression — PIH Pulse

Ce fichier sert de feuille de route pour le développement du projet. Cochez les cases au fur et à mesure de l'avancement.

> **État produit (fin session 2026-07-16) :** V1 hub **feature-complete** côté code (sprints A–E + médias + notifs + seeds).  
> **Source de vérité backlog :** [`AUDIT.md`](./AUDIT.md)  
> **Go store / TestFlight :** [`SHIP.md`](./SHIP.md)  
> **Prochaine priorité :** smoke device + EAS preview (pas de gros feature gap).

---

## 🛠️ Phase 1 : Initialisation & Structure de Base
- `[x]` Récupérer et copier le PRD et les maquettes HTML d'origine
- `[x]` Initialiser le dépôt Git local et configurer le dépôt distant
- `[x]` Initialiser l'application Expo (React Native) avec TypeScript et Expo Router
- `[x]` Installer les dépendances essentielles (`nativewind`, `tailwindcss`, `lucide-react-native`, `@supabase/supabase-js`, `expo-secure-store`)
- `[x]` Configurer le client Supabase basique et le fichier `.env`
- `[x]` Structurer la navigation de base avec les 5 onglets (Feed, Projets [icône Layers], Missions, Équipes, Profil)
- `[x]` Simplifier le Feed (suppression des onglets de filtres Tout/Projets/Missions en haut)

---

## 🎨 Phase 2 : Validation Graphique & Thèmes
- `[x]` Valider le thème de couleurs ("Premium Turmeric & Malt" validé)
- `[x]` Mettre à jour `tailwind.config.js` et `AGENTS.md` selon le thème final retenu
- `[x]` Importer et configurer les polices d'écriture personnalisées (Space Grotesk, Inter)
- `[x]` Ré-implémenter les 5 écrans de base avec le thème et le header validés (Feed, Projets, Missions, Équipes, Profil)

---

## 💾 Phase 3 : Base de Données (Supabase)
- `[x]` Configurer le projet Supabase réel (URL et Anon Key dans le fichier `.env`)
- `[x]` Créer les schémas de base de données (Tables PostgreSQL) :
  - `[x]` Table `profiles` (profils des talents)
  - `[x]` Table `projects` (startups et idées)
  - `[x]` Table `project_members` (association membres-projets)
  - `[x]` Table `missions` (tickets pratiques)
  - `[x]` Table `mission_applications` (candidatures aux missions)
  - `[x]` Table `reputation_logs` (historique des points)
  - `[x]` Table `messages` (messages de chat)
- `[x]` Configurer les règles de sécurité Row Level Security (RLS) et les politiques d'accès

---

## 🔑 Phase 4 : Authentification & Flux de Départ
- `[x]` Créer l'écran de **Splash** (redirection automatique)
- `[x]` Créer les écrans d'**Onboarding** (les 3 slides de présentation)
- `[x]` Créer l'écran de **Connexion** (Login) avec e-mail, mot de passe et connexions rapides (Google, Apple, GitHub)
- `[x]` Créer l'écran d'**Inscription** (Register) simplifié et connexions rapides
- `[x]` Créer l'écran de **Configuration de Profil** (Profile Setup) après inscription (Rôles, Compétences, Bio)
- `[x]` Connecter l'authentification avec les services de Supabase Auth (Phase 5)

---

## 🔄 Phase 5 : Connexion des Données Dynamiques
- `[x]` **Feed Screen :** Charger dynamiquement les projets et missions récents depuis Supabase
- `[x]` **Projets Screen :** 
  - `[x]` Connecter la liste avec recherche et filtres de statuts
  - `[x]` Créer l'écran de détail d'un projet (`app/project/[id].tsx`)
  - `[x]` Gérer l'action "Rejoindre ce projet" (candidature)
- `[x]` **Missions Screen :**
  - `[x]` Connecter la liste avec filtres de spécialités
  - `[x]` Créer l'écran de détail d'une mission (`app/mission/[id].tsx`)
  - `[x]` Gérer l'action "Postuler"
- `[x]` **Équipes Screen :** 
  - `[x]` Connecter la recherche de profils de la communauté
  - `[x]` Créer l'écran de détail d'un profil membre (`app/profile/[id].tsx`)
- `[x]` **Profil Screen :** Charger les données de l'utilisateur connecté (points réels, bio, rôle, compétences)

---

## 🚀 Phase 6 : Finalisation & Déploiement
- `[x]` Ajouter la gestion des notifications push essentielles (Expo Push Notifications)
- `[x]` Configurer EAS Build pour la compilation de l'application
- `[x]` Générer les builds APK/AAB pour Android et TestFlight pour iOS

---

## ✨ Phase 7 : V1.1 — Gamification & Polish (15 juil. 2026)
- `[x]` Niveaux uniques (Starter → Fondateur) affichés comme badge compact sur la carte profil
- `[x]` Grille multi-badges retirée (un seul axe : le niveau lié aux points)
- `[x]` Pull-to-refresh + pagination Feed
- `[x]` Guards auth sur `/project/create` et `/mission/create`
- `[x]` Schéma Supabase unifié (`supabase_schema.sql` source de vérité)
- `[x]` Validation mission par le Lead (+ points_reward + bonus 20 pts)
- `[x]` Reset mot de passe par code OTP (forgot-password → reset-password)
- `[x]` Feed / Projets / Missions : header auteur type hub (avatar, temps relatif) + ReactionBar sociale
- `[x]` Boucle validation 100% : candidature → approve → livrable → review → validation + points
- `[x]` activity_notifications + push + deep links
- `[x]` Feed intelligent : Tout / Pour moi / Mes équipes + ranking boosts

---

## 🏁 Phase 8 : V1.1+ hub polish (16 juil. 2026) — livré code

- `[x]` Sprints A–E (P0 listes, data forms, feed, collab, polish)
- `[x]` Posts caption unique (plus titre + corps)
- `[x]` MediaCarousel cover / thumbs vidéo / lightbox
- `[x]` Notifs réactions + chat projet + realtime badges
- `[x]` Seeds posts (`supabase_seeds_posts.sql`)
- `[x]` S0 scale : pagination Projets/Missions/Feed + indexes + boosts par page
- `[x]` S0.4 messages paginés + S0.5 scripts prod + S1 award_points RPC + Edge send-push
- `[x]` Prod ops : `FIX_PROD_SCALE` + `FIX_AWARD_POINTS` + Edge `send-push` déployée
- `[x]` S1 read model chat + compteurs denorm + UI Élan (code)
- `[x]` Prod SQL : `FIX_CHAT_READ_AND_COUNTS.sql` appliqué
- `[x]` S3 hardening code : hub_feed, award, bulk notifs, archive, k6, docs
- `[x]` Prod SQL : **`FIX_SCALE_HARDENING.sql`** appliqué
- `[x]` Commit/push lot scale
- `[x]` Code ship-ready hors stores : AuthGuard, edit projet, privacy, PTR profil, re-auth delete
- `[ ]` k6 / pg_cron (ops optionnel)
- `[ ]` EAS preview quand prêt + smoke device (`SHIP.md`)
- `[ ]` Comptes Apple / Google stores (hors code)
