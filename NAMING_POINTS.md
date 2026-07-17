# Naming — score de contribution (ex-« Impact »)

> **Statut :** ✅ **VALIDÉ — Élan** (2026-07-17)  
> **Objet :** libellé UI du karma PIH Pulse (solde `profiles.reputation_points`)  
> **Usage cible :** `+15 Élan`, badge profil, notifs, liste Talents  
> **DB / code :** `reputation_points` / `IMPACT_*` (idents code) — **UI 100 % Élan** (2026-07-17)  
> **Conservé :** ce fichier reste comme historique de décision (finalistes + grille)

---

## Finalistes retenus

| # | Nom | Note intuitive | Angle | Verdict court |
|---|-----|----------------|-------|---------------|
| 1 | **Élan** | ★★★★★ | Dynamisme, progression, très motivant | Top produit FR |
| 2 | **Essor** | ★★★★☆ | Décollage, croissance – très positif | Excellent, un peu littéraire |
| 3 | **Brasier** | ★★★★☆ | Feu, énergie, passion – chaud / africain | Fort en image, risque en UI |
| 4 | **Flamme** | ★★★★☆ | Porter la flamme de l’innovation | Clair, chaleureux |
| 5 | **Impulsion** | ★★★★☆ | Donne de l’impulsion aux projets | Juste sémantiquement, long |
| 6 | **Pulse** | ★★★★☆ | Marque (PIH **Pulse**), rythme du hub | Unique brand, anglais |

*(Notes alignées avec le workshop ; affinage ci-dessous pour le choix final.)*

---

## Critères de choix (hub talents / founders)

| Critère | Poids | Pourquoi |
|---------|-------|----------|
| **Court en UI** (`+12 X`) | haut | Notifs, badges, listes |
| **FR naturel** | haut | App majoritairement française |
| **Motivation** (envie de gagner) | haut | Boucle missions / réactions |
| **Cohérence marque** | moyen | Premium Turmeric & Malt, pas gamer |
| **Pas confus** avec niveaux | moyen | Starter…Fondateur restent des *niveaux* |
| **Unicité** (pas un générique) | moyen | Se démarquer d’Impact / XP / karma |

---

## Grille (1–5) pour trancher

| Nom | UI court | FR | Motivation | Marque | Clarté | **Total /25** |
|-----|----------|----|------------|--------|--------|---------------|
| **Élan** | 5 | 5 | 5 | 4 | 5 | **24** |
| **Pulse** | 5 | 3 | 4 | 5 | 4 | **21** |
| **Flamme** | 5 | 5 | 5 | 4 | 4 | **23** |
| **Essor** | 4 | 5 | 4 | 4 | 4 | **21** |
| **Impulsion** | 2 | 5 | 4 | 3 | 5 | **19** |
| **Brasier** | 3 | 4 | 5 | 5 | 3 | **20** |

### Détail rapide

- **Élan** — « Tu prends de l’élan », « +20 Élan », « 1 240 Élan · Innovateur ». Motivant sans être gamer. Sonne premium FR. Ne collisionne pas avec le nom de l’app.
- **Flamme** — Très fort émotionnellement (passion, innovation). Légèrement plus « feu / communauté » ; excellent pour une identité chaude (Turmeric). Un peu plus poétique qu’opérationnel.
- **Pulse** — Meilleur **branding** pur (`PIH Pulse` → monétiser le mot). Moins naturel en phrase FR (« j’ai 800 pulse » vs « j’ai 800 d’élan »). Risque de confusion app vs score.
- **Essor** — Beau, positif, un peu plus « discours » que « badge ».
- **Impulsion** — Sémantique parfaite (impulser des projets) mais **trop long** pour `+8 Impulsion` en notif.
- **Brasier** — Identité forte, chaleur africaine, différenciant. En UI : « +5 Brasier » peut surprendre ; « mon brasier » sonne un peu lourd / agressif pour un score talent.

---

## Recommandation

### Choix principal : **Élan**

**Pourquoi :**
1. Meilleur équilibre **motivation × clarté × FR × longueur**.
2. Se conjugue bien avec la progression : *prendre de l’élan*, *garder l’élan*, *élan fondateur*.
3. Ne vole pas le nom de l’app (contrairement à Pulse).
4. Plus « action / forward » qu’Impact (qui peut sonner ESG / rapport d’impact).
5. Court partout : `+15 Élan`, `Élan · 1 240`, notif `Mission validée · +40 Élan`.

### Excellent plan B : **Flamme**

Si l’équipe veut maximiser **chaleur, passion, Afrique / communauté** plutôt que « progression pure » → **Flamme**.  
Formules : `Porter la flamme`, `+12 Flamme`, niveau *Fondateur* qui « porte la flamme ».

### Plan C branding : **Pulse**

Si la priorité est **marque unique mondiale** et que le FR un peu anglicisé ne gêne pas → **Pulse**.  
À éviter si vous voulez une phrase 100 % française partout.

### À écarter (ou garder en lore uniquement)

| Nom | Décision |
|-----|----------|
| **Impulsion** | Trop long en UI → non pour le libellé principal |
| **Brasier** | Super en storytelling / onboarding, fragile en compteur quotidien |
| **Essor** | Beau 2ᵉ/3ᵉ choix, un cran sous Élan / Flamme en spontanéité |

---

## Duos possibles (si on veut un nom + une métaphore)

| Score (UI) | Métaphore (copy / onboarding) |
|------------|-------------------------------|
| **Élan** | « Chaque mission te donne de l’élan » |
| **Flamme** | « Allume la flamme, porte-la jusqu’au ship » |
| **Élan** + image flamme | Badge = Élan ; illustrations = flamme / turmeric |

Recommandation copy : **score = Élan**, **visuel = chaleur (turmeric / flamme)** sans renommer le compteur « Brasier ».

---

## Aperçus UI (pour trancher à l’œil)

```
Profil     1 240 Élan · Innovateur
Talents    860 Élan
Notif      Mission validée · +40 Élan
Réaction   +8 Élan au créateur
CTA        Complète ton profil · +20 Élan
```

vs Flamme / Pulse / Brasier — même structure, on sent tout de suite le ton.

---

## Décision

- [x] **Élan** (choisi)
- [ ] **Flamme**
- [ ] **Pulse**
- [ ] **Essor**
- [ ] **Brasier**
- [ ] **Impulsion**
- [ ] Autre : ___________

**Validé le :** 2026-07-17  
**Par :** équipe PIH Pulse  

**Décision :** libellé produit = **Élan**.  
Les finalistes (Flamme, Pulse, Essor, Brasier, Impulsion) restent documentés ici pour référence — on n’efface pas l’historique.

Prochaine étape code (quand priorisé) → renommer l’UI `Impact` → `Élan` ; garder les colonnes SQL (`reputation_points`) sans migration cosmétique.

---

## Prochaine étape technique (après validation)

1. Remplacer libellés UI `Impact` → nom choisi (écrans, notifs, `ImpactBanner`, Talents, etc.).
2. Optionnel : renommer `lib/impact.ts` → `lib/elan.ts` (ou garder le fichier + export `ELAN_POINTS`).
3. **Ne pas** renommer `reputation_points` en DB sans migration dédiée.
4. Mettre à jour `AUDIT.md` / onboarding slide réputation.
```
