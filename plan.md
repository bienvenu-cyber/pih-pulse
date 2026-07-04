# Plan d'Exécution & Progression — PIH Pulse

Ce fichier sert de feuille de route pour le développement du projet. Cochez les cases au fur et à mesure de l'avancement.

---

## 🛠️ Phase 1 : Initialisation & Structure de Base
- `[x]` Récupérer et copier le PRD et les maquettes HTML d'origine
- `[x]` Initialiser le dépôt Git local et configurer le dépôt distant
- `[x]` Initialiser l'application Expo (React Native) avec TypeScript et Expo Router
- `[x]` Installer les dépendances essentielles (`nativewind`, `tailwindcss`, `lucide-react-native`, `@supabase/supabase-js`, `expo-secure-store`)
- `[x]` Configurer le client Supabase basique et le fichier `.env`
- `[x]` Structurer la navigation de base avec les 5 onglets (Feed, Projets, Missions, Équipes, Profil)

---

## 🎨 Phase 2 : Validation Graphique & Thèmes (En Cours)
- `[ ]` Valider le thème de couleurs (Analyser les options de thèmes dans les fichiers SVG de téléchargement)
- `[ ]` Mettre à jour `tailwind.config.js` et `global.css` selon le thème final retenu
- `[ ]` Importer et configurer les polices d'écriture personnalisées (Space Grotesk, Inter)
- `[ ]` Harmoniser l'ensemble des 5 écrans existants avec le thème validé

---

## 💾 Phase 3 : Base de Données (Supabase)
- `[ ]` Configurer le projet Supabase réel (URL et Anon Key dans le fichier `.env`)
- `[ ]` Créer les schémas de base de données (Tables PostgreSQL) :
  - `[ ]` Table `users` (profils des talents)
  - `[ ]` Table `projects` (startups et idées)
  - `[ ]` Table `project_members` (association membres-projets)
  - `[ ]` Table `missions` (tickets pratiques)
  - `[ ]` Table `mission_applications` (candidatures aux missions)
  - `[ ]` Table `reputation_logs` (historique des points)
- `[ ]` Configurer les règles de sécurité Row Level Security (RLS) et les politiques d'accès

---

## 🔑 Phase 4 : Authentification & Flux de Départ
- `[ ]` Créer l'écran de **Splash** (chargement et vérification de la session Supabase)
- `[ ]` Créer les écrans d'**Onboarding** (les 3 slides de présentation)
- `[ ]` Créer l'écran de **Connexion** (Login) avec email/mot de passe
- `[ ]` Créer l'écran d'**Inscription** (Register) avec sélection des compétences (tags multiples)
- `[ ]` Connecter l'authentification avec les services de Supabase Auth

---

## 🔄 Phase 5 : Connexion des Données Dynamiques
- `[ ]` **Feed Screen :** Charger dynamiquement les projets et missions récents depuis Supabase
- `[ ]` **Projets Screen :** 
  - Connecter la liste avec recherche et filtres de statuts
  - Créer l'écran de détail d'un projet (`app/project/[id].tsx`)
  - Gérer l'action "Rejoindre ce projet" (candidature)
- `[ ]` **Missions Screen :**
  - Connecter la liste avec filtres de spécialités
  - Créer l'écran de détail d'une mission (`app/mission/[id].tsx`)
  - Gérer l'action "Postuler"
- `[ ]` **Équipes Screen :** Connecter la recherche de profils de la communauté
- `[ ]` **Profil Screen :** Charger les données de l'utilisateur connecté (points réels, badges débloqués, historique des missions)

---

## 🚀 Phase 6 : Finalisation & Déploiement
- `[ ]` Ajouter la gestion des notifications push essentielles (Expo Push Notifications)
- `[ ]` Configurer EAS Build pour la compilation de l'application
- `[ ]` Générer les builds APK/AAB pour Android et TestFlight pour iOS
