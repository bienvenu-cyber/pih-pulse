# Splash screen — PIH Pulse

Comment le splash **doit** être conçu et régénéré (surtout après un changement d’icônes).

## Ce que l’utilisateur voit

**Un seul branding :** logo centré + **from Beyond** en bas (pas de splash « logo seul »).

1. **Splash natif** (figé dans le binaire EAS, premier paint)  
   - Images full-screen : `splash-light.png` / `splash-dark.png`  
   - Contiennent déjà logo + « from Beyond »  
   - Fond clair `#F8F5EC` / sombre `#0D0B05` (mode **système**)  
   - Plugin : `enableFullScreenImage_legacy: true` pour afficher l’image complète (pas un logo 200 px seul)

2. **Splash JS** `components/BrandedSplash.tsx` (dès que le JS tourne)  
   - Même layout : logo Élan centré + `from` / **Beyond**  
   - Suit le mode système, ou `theme_flavor` si déjà en SecureStore/localStorage  

3. Puis navigation (Feed / Login / Onboarding).

La transition natif → JS doit être **visuellement identique** (même branding), pas un second design.

## Fichiers

| Fichier | Rôle |
|---------|------|
| `assets/images/icon.png` | Source logo (1024²) + icône app |
| `assets/images/splash-dark.png` | Splash full-screen sombre (natif + référence) |
| `assets/images/splash-light.png` | Splash full-screen clair (natif + référence) |
| `scripts/generate-splash.py` | Régénère les 2 PNG depuis `icon.png` |
| `components/BrandedSplash.tsx` | UI runtime (layout exact, safe area) |
| `app.json` → plugin `expo-splash-screen` | Config native |
| `app/index.tsx` | Masque le natif, affiche `BrandedSplash` pendant le routing |

**Ne pas** repasser le splash natif sur `icon.png` seul (ancien design logo-only).

## Après régénération des icônes

1. Remplacer / régénérer la famille d’icônes :  
   `icon.png`, `icon-512.png`, `favicon.png`,  
   `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`.
2. **Régénérer les splash full-screen** (logo + from Beyond) :  
   ```bash
   python3 scripts/generate-splash.py
   ```
3. Vérifier `app.json` :  
   - `image` → `./assets/images/splash-light.png`  
   - `dark.image` → `./assets/images/splash-dark.png`  
   - `backgroundColor` light `#F8F5EC`, dark `#0D0B05`  
   - `resizeMode`: `contain`  
   - `enableFullScreenImage_legacy`: `true`
4. Vérifier que `BrandedSplash` charge toujours `require('../assets/images/icon.png')`.
5. **Rebuild EAS** (preview/prod) — le splash natif n’est pas mis à jour par un simple OTA JS.

## Règles produit

- **2 modes splash** (clair / sombre système), **pas 3** thèmes app (light / malt / dark).  
  Malt et Sombre (dark) partagent le splash sombre.
- Branding bas d’écran : toujours **`from` + `Beyond`** (Beyond Tech) — **natif et JS**.
- Fond sombre = malt deep `#0D0B05` (pas noir pur au cold start).
- Fond clair = papier `#F8F5EC`.
- Turmeric uniquement dans le **logo**, pas pour le texte « from Beyond ».

## Ce qu’il ne faut pas faire

- Ne pas reconfigurer le splash natif sur `icon.png` (logo seul sans « from Beyond »).
- Ne pas cacher le splash natif avant le premier frame de `BrandedSplash` (flash blanc).
- Ne pas inventer un 3ᵉ design de splash.
