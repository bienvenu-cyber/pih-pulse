# PIH Pulse — Product Requirements Document

> Version 1.0 — Juillet 2026  
> Stack : Expo (React Native) + Supabase  
> Plateforme : iOS & Android

---

## 1. Vue d'ensemble

**PIH Pulse** est une application mobile destinée à l'écosystème du Parakou Innovation Hub (PIH). Elle connecte les talents locaux (développeurs, designers, entrepreneurs) à des projets réels, des missions concrètes et des équipes actives.

**Objectif principal :** Transformer des individus isolés en constructeurs collectifs de startups technologiques.

**Utilisateurs cibles :**
- Développeurs juniors/seniors souhaitant pratiquer sur des projets réels
- Designers cherchant à constituer un portfolio
- Entrepreneurs porteurs d'idées cherchant des co-fondateurs
- Mentors et membres actifs de l'écosystème PIH

---

## 2. Architecture de navigation

L'app suit une structure à **5 onglets principaux** (Bottom Tab Navigator) avec des stacks imbriquées.

```
┌─────────────────────────────────────────┐
│              PIH Pulse App              │
└─────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│            Auth Stack                   │
│  Splash → Onboarding → Login / Register │
└─────────────────────────────────────────┘
         │ (authentifié)
         ▼
┌─────────────────────────────────────────────────────┐
│                  Bottom Tab Navigator               │
│                                                     │
│  [Feed]  [Projets]  [Missions]  [Équipes]  [Profil] │
└─────────────────────────────────────────────────────┘
```

---

## 3. Écrans détaillés

### 3.1 Auth Stack

#### Splash Screen
- Logo PIH Pulse animé
- Chargement de la session (Supabase auth check)
- Redirection automatique vers Feed ou Onboarding

#### Onboarding (3 slides)
- **Slide 1** : "Rejoins des projets réels" — illustration d'une équipe
- **Slide 2** : "Complète des missions concrètes" — illustration de missions
- **Slide 3** : "Construis ta réputation" — illustration du système de points
- Bouton "Commencer" → Login/Register

#### Register Screen
- Champs : Nom complet, Email, Mot de passe
- Sélection des compétences (tags multiples : Dev Frontend, Dev Backend, Design UI/UX, Product, Marketing, Data, etc.)
- Avatar par défaut (ou upload photo)
- Bouton "Créer mon profil"

#### Login Screen
- Email + Mot de passe
- "Mot de passe oublié ?" → Reset par email
- Connexion Google (OAuth Supabase)

---

### 3.2 Feed (Onglet 1)

**Rôle :** Flux d'activité central, point d'entrée principal de l'app.

```
┌────────────────────────────┐
│  🔔  PIH Pulse        [🔔] │
├────────────────────────────┤
│  [Tout] [Projets] [Missions│
│   ] [Événements]           │
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ 🚀 NOUVEAU PROJET    │   │
│ │ WapiFood             │   │
│ │ App de livraison...  │   │
│ │ 📍 Parakou           │   │
│ │ 🧑‍💻 3/5 membres       │   │
│ │ [Voir le projet]     │   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ 🎯 MISSION           │   │
│ │ Design du logo PIH.. │   │
│ │ ⏱ 3 jours • 50 pts  │   │
│ │ [Postuler]           │   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ 📢 ÉVÉNEMENT         │   │
│ │ Hackathon FinTech    │   │
│ │ 📅 15 Juillet 2026   │   │
│ │ [S'inscrire]         │   │
│ └──────────────────────┘   │
└────────────────────────────┘
```

**Fonctionnalités :**
- Filtres par type : Projets / Missions / Événements / Hackathons
- Pull-to-refresh
- Infinite scroll (pagination Supabase)
- Cards cliquables → détail de chaque item
- Badges "Nouveau" sur les publications < 24h

---

### 3.3 Projets (Onglet 2)

**Rôle :** Explorer et rejoindre des projets en cours.

#### Liste des projets

```
┌────────────────────────────┐
│  Projets              [+ ] │
├────────────────────────────┤
│ 🔍 Rechercher...           │
├────────────────────────────┤
│ [Tous] [Idée] [Proto] [MVP]│
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ WapiFood 🟡 Prototype│   │
│ │ App livraison Parakou│   │
│ │ React Native • Node  │   │
│ │ 👥 3/5  •  🏆 +200pts│   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ EduTrack 🔵 Idée     │   │
│ │ Suivi scolaire...    │   │
│ │ Flutter • Firebase   │   │
│ │ 👥 1/4  •  🏆 +150pts│   │
│ └──────────────────────┘   │
└────────────────────────────┘
```

#### Détail d'un projet

```
┌────────────────────────────┐
│  ← WapiFood         [•••] │
├────────────────────────────┤
│  🟡 Prototype              │
│                            │
│  App de livraison de       │
│  repas à Parakou...        │
│                            │
│  Stack : React Native,     │
│  Node.js, Supabase         │
│                            │
│  ── Progression ──         │
│  ████████░░░░ 60%          │
│                            │
│  ── Équipe ──              │
│  [Avatar] Koffi (Lead)     │
│  [Avatar] Ines (Design)    │
│  [ + Rejoindre ]           │
│                            │
│  ── Besoins ──             │
│  • Dev Backend Node.js     │
│  • Designer Mobile UI      │
│                            │
│  ── Missions actives ──    │
│  › API paiement MoMo       │
│  › Maquettes écran home    │
│                            │
│  [Rejoindre ce projet]     │
└────────────────────────────┘
```

**Statuts de projet :**

| Statut | Couleur | Description |
|---|---|---|
| 💡 Idée | Gris | Concept initial, pas encore d'équipe |
| 🟡 Prototype | Jaune | Équipe formée, en construction |
| 🔵 MVP | Bleu | Version testable disponible |
| 🟢 Lancé | Vert | Produit en production |

---

### 3.4 Missions (Onglet 3)

**Rôle :** Tâches concrètes et courtes ouvertes à la contribution.

#### Liste des missions

```
┌────────────────────────────┐
│  Missions                  │
├────────────────────────────┤
│ [Toutes] [Dev] [Design]    │
│ [Analyse] [Marketing]      │
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ 🎨 Design logo       │   │
│ │ WapiFood             │   │
│ │ ⏱ 3 jours • 🏆 50pts │   │
│ │ 🔓 Ouverte           │   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ 💻 Intégration API   │   │
│ │ EduTrack             │   │
│ │ ⏱ 7 jours • 🏆 120pts│   │
│ │ 🔓 Ouverte           │   │
│ └──────────────────────┘   │
└────────────────────────────┘
```

#### Détail d'une mission

```
┌────────────────────────────┐
│  ← Intégration API MoMo    │
├────────────────────────────┤
│  Projet : EduTrack         │
│  Type : Développement      │
│  Durée estimée : 7 jours   │
│  Récompense : 🏆 120 pts   │
│  Statut : 🔓 Ouverte       │
│                            │
│  ── Description ──         │
│  Intégrer l'API MTN MoMo   │
│  pour les paiements dans   │
│  l'app EduTrack...         │
│                            │
│  ── Compétences requises ──│
│  • Node.js                 │
│  • REST API                │
│  • Mobile Money            │
│                            │
│  ── Livrables attendus ──  │
│  • Code source commenté    │
│  • PR sur le repo GitHub   │
│  • Documentation           │
│                            │
│  [Postuler à cette mission]│
└────────────────────────────┘
```

**Statuts de mission :**
- 🔓 Ouverte — disponible pour candidature
- ⏳ En cours — assignée à un contributeur
- ✅ Complétée — validée, points attribués
- 🔒 Fermée — annulée ou expirée

---

### 3.5 Équipes / Communauté (Onglet 4)

**Rôle :** Découvrir les talents et les équipes de l'écosystème.

#### Tabs internes
- **Membres** : Liste des profils du hub
- **Mes équipes** : Les projets dont l'utilisateur fait partie

#### Liste des membres

```
┌────────────────────────────┐
│  Communauté                │
├────────────────────────────┤
│  [Membres]    [Mes équipes]│
├────────────────────────────┤
│ 🔍 Chercher un talent...   │
├────────────────────────────┤
│ ┌──────────────────────┐   │
│ │ [📷] Koffi A.        │   │
│ │ Dev Full Stack        │   │
│ │ React • Node • SQL   │   │
│ │ 🏆 1 240 pts   5 🚀  │   │
│ └──────────────────────┘   │
│ ┌──────────────────────┐   │
│ │ [📷] Inès M.         │   │
│ │ UI/UX Designer        │   │
│ │ Figma • Illustrator  │   │
│ │ 🏆 780 pts    3 🚀   │   │
│ └──────────────────────┘   │
└────────────────────────────┘
```

#### Profil d'un membre (public)

- Photo + Nom + Bio courte
- Compétences (tags)
- Score de réputation + niveau
- Projets rejoints
- Missions complétées
- Bouton "Inviter sur un projet" (si tu es Lead d'un projet)

---

### 3.6 Profil personnel (Onglet 5)

```
┌────────────────────────────┐
│  Mon Profil          [⚙️] │
├────────────────────────────┤
│       [📷 Avatar]          │
│    Bienvenu T. (BV)        │
│    Founder • Dev Full Stack│
│                            │
│  🏆 2 450 pts  │  Niveau 4 │
│  ████████████░ 82%         │
│  → Niveau 5 dans 120 pts   │
│                            │
│  ── Compétences ──         │
│  [React] [Node] [Supabase] │
│  [WhatsApp API] [MoMo API] │
│                            │
│  ── Mes projets (3) ──     │
│  › WapiFood (Lead)         │
│  › PIH Pulse (Contributeur)│
│                            │
│  ── Missions complétées ── │
│  ✅ Intégration MoMo  +120 │
│  ✅ UI Onboarding     +50  │
│                            │
│  ── Badges ──              │
│  🥇 Premier projet         │
│  🔥 5 missions en 30 jours │
└────────────────────────────┘
```

---

## 4. Système de réputation

### Niveaux

| Niveau | Nom | Points requis |
|---|---|---|
| 1 | Spark | 0 – 199 |
| 2 | Builder | 200 – 599 |
| 3 | Maker | 600 – 1 199 |
| 4 | Innovator | 1 200 – 2 499 |
| 5 | Founder | 2 500+ |

### Gains de points

| Action | Points |
|---|---|
| Rejoindre un projet | +20 |
| Compléter une mission simple | +50 |
| Compléter une mission complexe | +100 – 150 |
| Mission validée par le lead | +20 bonus |
| Publier un projet | +30 |
| Projet passe en MVP | +100 |
| Projet passe en Lancé | +200 |
| Invitation acceptée | +10 |

### Badges débloquables
- 🚀 **First Launch** — Premier projet rejoint
- 🔥 **On Fire** — 5 missions en 30 jours
- 🧱 **BrickLayer** — 10 missions complétées
- 👑 **Founder** — Projet arrivé au stade Lancé
- 🤝 **Connector** — 3 membres invités sur des projets
- 💡 **Idea Machine** — 3 projets publiés

---

## 5. Modèle de données (Supabase)

### Table `users`
```sql
id            uuid PRIMARY KEY
full_name     text
email         text UNIQUE
avatar_url    text
bio           text
skills        text[]        -- ['React', 'Node.js', ...]
reputation    integer DEFAULT 0
level         integer DEFAULT 1
created_at    timestamp
```

### Table `projects`
```sql
id            uuid PRIMARY KEY
title         text
description   text
status        enum('idea', 'prototype', 'mvp', 'launched')
tech_stack    text[]
lead_id       uuid REFERENCES users(id)
max_members   integer
created_at    timestamp
```

### Table `project_members`
```sql
project_id    uuid REFERENCES projects(id)
user_id       uuid REFERENCES users(id)
role          text          -- 'lead', 'contributor'
joined_at     timestamp
PRIMARY KEY (project_id, user_id)
```

### Table `missions`
```sql
id            uuid PRIMARY KEY
project_id    uuid REFERENCES projects(id)
title         text
description   text
type          enum('dev', 'design', 'analysis', 'marketing')
status        enum('open', 'in_progress', 'completed', 'closed')
points        integer
deadline      timestamp
assignee_id   uuid REFERENCES users(id)
created_at    timestamp
```

### Table `mission_applications`
```sql
id            uuid PRIMARY KEY
mission_id    uuid REFERENCES missions(id)
user_id       uuid REFERENCES users(id)
status        enum('pending', 'accepted', 'rejected')
applied_at    timestamp
```

### Table `reputation_logs`
```sql
id            uuid PRIMARY KEY
user_id       uuid REFERENCES users(id)
action        text
points        integer
ref_id        uuid          -- id du projet ou mission concerné
created_at    timestamp
```

### Table `feed_items`
```sql
id            uuid PRIMARY KEY
type          enum('project', 'mission', 'event', 'hackathon')
ref_id        uuid
title         text
summary       text
created_at    timestamp
```

---

## 6. Notifications Push

Les notifications sont gérées via **Expo Push Notifications + Supabase Edge Functions**.

| Déclencheur | Message |
|---|---|
| Nouveau projet publié | "🚀 Nouveau projet : [titre]" |
| Mission disponible | "🎯 Mission ouverte dans [projet]" |
| Candidature acceptée | "✅ Tu rejoins l'équipe [projet] !" |
| Mission complétée validée | "🏆 +[X] pts ajoutés à ton profil" |
| Invitation à rejoindre un projet | "[Nom] t'invite sur [projet]" |
| Badge débloqué | "🎖 Nouveau badge : [nom du badge]" |

---

## 7. MVP — Scope de lancement

Le MVP se concentre sur le noyau fonctionnel minimum viable.

### ✅ Inclus dans le MVP

- Auth (inscription / connexion / Google OAuth)
- Onboarding + sélection de compétences
- Feed (projets + missions)
- Publication d'un projet
- Rejoindre un projet
- Liste et détail des missions
- Postuler à une mission
- Profil utilisateur (personnel + public)
- Système de points (basique)
- Notifications push (essentielles)

### ❌ Hors MVP (V2)

- Chat en temps réel entre membres d'une équipe
- Système de badges complet
- Hackathons et événements
- Tableau de bord Lead de projet (gestion avancée)
- Leaderboard communautaire
- Suivi de progression détaillé par projet
- Intégration GitHub (suivi des contributions)

---

## 8. Stack technique

| Couche | Technologie |
|---|---|
| Mobile | Expo SDK 51+ (React Native) |
| Language | TypeScript |
| UI | NativeWind (Tailwind pour RN) ou React Native Paper |
| Navigation | Expo Router v3 (file-based routing) |
| State | Zustand |
| Backend / DB | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Push Notifications | Expo Notifications + Supabase Edge Functions |
| Déploiement | EAS Build (iOS + Android) |

---

## 9. Charte visuelle

### Palette — "Turmeric & Malt"

Une identité ancrée West Africa : terre, soleil, énergie brute. Distinctif dans l'écosystème tech africain, reconnaissable immédiatement.

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
> **Dark only.** La palette Turmeric/Malt est une identité dark par nature — pas de mode light.

| Rôle | Nom | Hex | Usage |
|---|---|---|---|
| Background | Malt profond | `#2A2312` | ✅ Fond par défaut — toujours |
| Surface | Malt clair | `#3D3118` | Cartes, modales, bottom sheets |
| Nav / Overlay | Malt noir | `#1A150A` | Bottom nav, status bar, fond des modales |
| Primary / CTA | Turmeric | `#FFBE0B` | Boutons, actions, icônes actives, highlights |
| Texte principal | Crème | `#F5EDD6` | Titres, corps de texte — jamais de blanc pur |
| Texte secondaire | Sable | `#A89060` | Labels, dates, metadata, placeholders |
| Statut succès | Vert kaki | `#7CB87A` | Missions complétées, projet MVP/Lancé |
| Statut danger | Corail | `#E8634A` | Erreurs, deadlines dépassées |

### Règles d'utilisation

- Le **Turmeric `#FFBE0B`** est réservé aux CTAs, icônes actives et highlights — jamais en fond de carte (trop agressif sur de grandes surfaces)
- Le **Malt clair `#3D3118`** pour toutes les cards au-dessus du fond
- Le **Crème `#F5EDD6`** pour tout texte principal — jamais `#FFFFFF` pur, qui casse la chaleur de la palette
- Le **Corail et le Vert kaki** uniquement pour les statuts — pas comme couleurs décoratives

### Typographie

- **Display / Titres :** Space Grotesk (Bold) — moderne, caractère fort
- **Corps / UI :** Inter (Regular / Medium) — lisibilité mobile maximale
- **Data / Points / Badges :** Inter Mono — chiffres de réputation, scores

### Style général

Dark only — `#2A2312` en fond systématique, cartes arrondies (border-radius 12-16px), ombres chaudes (pas de drop-shadow bleu/gris froid), iconographie Phosphor Icons ou Lucide.

---

## 10. Roadmap

```
Phase 1 — MVP (6-8 semaines)
  ├── Semaine 1-2 : Setup Expo + Supabase + Auth + Navigation
  ├── Semaine 3-4 : Feed + Projets (liste + détail + rejoindre)
  ├── Semaine 5-6 : Missions + Profil + Système de points
  └── Semaine 7-8 : Notifications + Tests + Build EAS

Phase 2 — V2 (après feedback)
  ├── Chat équipe (Supabase Realtime)
  ├── Badges + Leaderboard
  └── Hackathons & Événements

Phase 3 — PIH Venture Builder
  ├── Détection de fondateurs
  └── Accélération de projets
```

---

*Document préparé par Beyond Tech pour PIH — Parakou Innovation Hub*  
*Juillet 2026*
