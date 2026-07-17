# Directives pour les Agents IA — PIH Pulse

Ce fichier contient les règles, contraintes et instructions que tout agent IA doit suivre lorsqu'il contribue au projet **PIH Pulse**.

---

## 🛠️ Stack Technique & Standard de Code

* **Expo (React Native) v57 :** Toujours se référer aux docs officiels d'Expo v57 pour l'écriture de code.
* **TypeScript :** Utiliser un typage strict pour toutes les variables, props et réponses d'API.
* **Navigation :** Utiliser Expo Router (navigation par fichiers).
* **Styles :** Utiliser **NativeWind v4** (Tailwind CSS). Ne pas écrire de styles inline ou StyleSheet sauf cas de force majeure.
* **Icônes :** Utiliser `lucide-react-native` pour les icônes vectorielles.

---

## 🎨 Charte Graphique Validée ("Premium Turmeric & Malt")

L'application supporte **3 thèmes** sélectionnables par l'utilisateur dans le profil :
1. **Malt Premium** (Sombre Doré) - Thème par défaut
2. **Noir Absolu OLED** (Sombre Noir)
3. **Papier & Or** (Mode Clair)

* **Couleurs du Thème (Tailwind Config) :**
  - Fond de l'app (Malt profond) : `bg-malt-deep` (`#0D0B05`)
  - Cartes & Surfaces (Malt clair) : `bg-malt-card` (`#18140B`)
  - Barres de nav & Header (Malt noir) : `bg-malt-nav` (`#080703`)
  - Bordures fines (Malt bordure) : `border-malt` (`#261F12`)
  - Éléments cliquables actifs / CTA (Turmeric) : `bg-turmeric` (`#FFBE0B`)
  - Textes principaux (Crème) : `text-creme` (`#F5EDD6`)
  - Textes secondaires / Placeholder (Sable) : `text-sable` (`#A39171`)
  - Succès : `text-kaki` / `bg-kaki/15` (`#7CB87A`)
  - Danger / Erreurs : `text-corail` / `bg-corail/15` (`#E8634A`)

* **Gestion des Thèmes :**
  - Utiliser le hook `themeFlavor` avec valeurs : `'malt' | 'oled' | 'light'`
  - Le thème est sauvegardé dans SecureStore (mobile) ou localStorage (web)
  - Les couleurs s'adaptent dynamiquement selon le thème sélectionné

* **Discipline d'utilisation du Jaune (Turmeric) :**
  Le jaune `#FFBE0B` doit être utilisé de manière extrêmement restreinte (maximum 5% de la surface de l'écran) :
  - Uniquement pour l'icône/onglet actif du Bottom Nav.
  - Uniquement pour le bouton d'action principal (CTA) de l'écran ou de la carte vedette.
  - Tout texte ou icône secondaire doit utiliser du Crème ou du Sable, jamais de jaune.

---

## 🧭 Navigation & Layout de l'En-tête

* **Bottom Tab Navigation (5 onglets) — icônes seules** (`tabBarShowLabel: false`) :
  Labels accessibles via `tabBarAccessibilityLabel` uniquement (pas de texte sous les icônes).
  1. **Feed** (icône `Home`)
  2. **Projets** (icône `Layers` — attention, ne pas utiliser d'icône Rocket)
  3. **Missions** (icône `Target`)
  4. **Talents** (icône `Users` — annuaire communauté, ex-« Équipes »)
  5. **Profil** (icône `User`)
  - Actif : turmeric · Inactif : sable/crème secondaire · Taille icône 22.

* **Header (En-tête de l'application) — style social clean (Instagram-like) :**
  - Titre / wordmark à gauche : **PIH Pulse** (ou titre de l’écran) ; feed peut utiliser `+` création.
  - Actions à droite : **icônes nues** (pas de pastille/cercle bordé, pas de fond carte).
    1. Notifications — `Bell` (24, stroke ~1.85).
    2. Messagerie — `MessageCircle` (bulle, **pas** `Send` / avion).
  - Badges non-lus : petite pastille turmeric sur l’icône uniquement.
  - Header flottant léger (`headerBg` semi-transparent) + hairline, hauteur contenu ~48.

---

## 🎬 Splash screen

* Spec complète : [docs/SPLASH.md](docs/SPLASH.md).
* Natif : `icon.png` centré + fond clair/sombre système (`app.json` / expo-splash-screen).
* JS : `BrandedSplash` = logo centré + **from Beyond** en bas.
* Après regen d’icônes : `python3 scripts/generate-splash.py` puis **rebuild EAS**.
* Pas de fichier `splash-icon.png` séparé — uniquement `icon.png` + maquettes `splash-dark.png` / `splash-light.png`.

## 📖 Références de Conception

* Se référer au fichier [plan.md](file:///Users/bv/Desktop/PIH-PULSE/plan.md) pour suivre et cocher les checklists après chaque modification.
