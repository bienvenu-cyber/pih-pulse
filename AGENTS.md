# Directives pour les Agents IA — PIH Pulse

Ce fichier contient les règles, contraintes et instructions que tout agent IA doit suivre lorsqu'il contribue au projet **PIH Pulse**.

---

## 🛠️ Stack Technique & Standard de Code

* **Expo (React Native) v57 :** Toujours se référer aux docs officiels d'Expo v57 pour l'écriture de code.
* **TypeScript :** Utiliser un typage strict pour toutes les variables, props et réponses d'API.
* **Navigation :** Utiliser Expo Router (navigation par fichiers).
* **Styles :** Utiliser **NativeWind v4** (Tailwind CSS). Ne pas écrire de styles inline ou StyleSheet sauf cas de force majeure.
* **Icônes :** Utiliser `lucide-react-native`.

---

## 🎨 Charte Graphique (Aesthetics & Theme)

* **Mode Sombre Uniquement :** L'application n'a pas de mode clair. Le thème est "Turmeric & Malt".
* **Palette de Couleurs (Tailwind Config) :**
  - Fond de l'app : `bg-malt-deep` (`#2A2312`)
  - Cartes & Surfaces : `bg-malt-light` (`#3D3118`)
  - Barres de nav & Modales : `bg-malt-dark` (`#1A150A`)
  - Éléments cliquables / CTA : `bg-turmeric` (`#FFBE0B`)
  - Textes principaux : `text-creme` (`#F5EDD6`)
  - Textes secondaires / Placeholder : `text-sable` (`#A89060`)
  - Succès : `text-kaki` / `bg-kaki/15` (`#7CB87A`)
  - Danger / Erreurs : `text-corail` / `bg-corail/15` (`#E8634A`)

---

## 💾 Conventions Supabase

* **Client :** Toujours importer le client depuis `lib/supabase.ts`.
* **Sécurité :** Ne jamais exposer de clés secrètes (service_role). Toujours utiliser des clés publiques anonymes (`EXPO_PUBLIC_SUPABASE_ANON_KEY`).
* **Session :** L'authentification utilise la persistance automatique via `expo-secure-store`.

---

## 📖 Références de Conception

* Lire en priorité le document [PIH_Pulse_PRD.md](file:///Users/bv/Desktop/PIH-PULSE/PIH_Pulse_PRD.md) pour comprendre la logique métier de chaque écran.
* Consulter le fichier [plan.md](file:///Users/bv/Desktop/PIH-PULSE/plan.md) pour suivre la progression et mettre à jour les checklists après chaque modification.
