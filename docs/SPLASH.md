# Splash screen — PIH Pulse

Comment le splash **doit** être conçu et régénéré (surtout après un changement d’icônes).

## Ce que l’utilisateur voit

1. **Splash natif** (figé dans le binaire EAS, premier paint)  
   - Fond : clair `#F8F5EC` ou sombre `#0D0B05` (mode **système**, pas les 3 thèmes app).  
   - Image : logo centré `assets/images/icon.png` (~200 px, `imageWidth`).  
   - Pas de texte « from Beyond » ici (limitation Android 12+ / splash OS).

2. **Splash JS** `components/BrandedSplash.tsx` (dès que le JS tourne)  
   - Logo Élan **centré**.  
   - En bas : `from` (sable `#A39171`) + **Beyond** (crème ou malt).  
   - Suit le mode système, ou `theme_flavor` si déjà en SecureStore/localStorage (`light` → clair, `malt`/`oled` → sombre).

3. Puis navigation (Feed / Login / Onboarding).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `assets/images/icon.png` | Source logo (1024²) — **aussi** image du splash natif |
| `assets/images/splash-dark.png` | Maquette full-screen sombre (logo + from Beyond) — doc / preview / regen |
| `assets/images/splash-light.png` | Maquette full-screen clair |
| `scripts/generate-splash.py` | Régénère les 2 maquettes depuis `icon.png` |
| `components/BrandedSplash.tsx` | UI runtime (layout exact, safe area) |
| `app.json` → plugin `expo-splash-screen` | Config native |
| `app/index.tsx` | Masque le natif, affiche `BrandedSplash` pendant le routing |

**Ne pas recréer** un `splash-icon.png` séparé : on réutilise `icon.png` pour le natif.

## Après régénération des icônes

1. Remplacer / régénérer la famille d’icônes :  
   `icon.png`, `icon-512.png`, `favicon.png`,  
   `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`.
2. **Régénérer les maquettes splash** (logo dans le cercle + from Beyond) :  
   ```bash
   python3 scripts/generate-splash.py
   ```
3. Vérifier `app.json` :  
   - `image` / `dark.image` → `./assets/images/icon.png`  
   - `backgroundColor` light `#F8F5EC`, dark `#0D0B05`  
   - `imageWidth`: `200`  
   - `resizeMode`: `contain`
4. Vérifier que `BrandedSplash` charge toujours `require('../assets/images/icon.png')`.
5. **Rebuild EAS** (preview/prod) — le splash natif n’est pas mis à jour par un simple OTA JS.

## Règles produit

- **2 modes splash** (clair / sombre système), **pas 3** thèmes app (malt / oled / light).  
  Malt et OLED partagent le splash sombre.
- Branding bas d’écran : toujours **`from` + `Beyond`** (Beyond Tech).
- Fond sombre = malt deep `#0D0B05` (pas noir pur OLED au cold start).
- Fond clair = papier `#F8F5EC`.
- Turmeric uniquement dans le **logo**, pas pour le texte « from Beyond ».

## Ce qu’il ne faut pas faire

- Ne pas remettre un second fichier `splash-icon.png` en doublon de `icon.png`.
- Ne pas compter sur une image full-screen comme seul splash Android 12+ (l’OS centre un logo, pas un mockup téléphone).
- Ne pas cacher le splash natif avant le premier frame de `BrandedSplash` (flash blanc).
