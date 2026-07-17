# OAuth rapide — checklist PIH Pulse

## Redirect URLs (Supabase → Authentication → URL Configuration)

Ajoute **exactement** :

```
pihpulse://auth/callback
```

Site URL (dev) peut rester `http://localhost:3000` ou l’URL du site.

## Providers

| Provider | Dashboard Supabase | Notes app |
|----------|-------------------|-----------|
| Google | Client ID **Web** + secret | L’app ne force plus de client_id Android dans la requête |
| GitHub | OAuth App callback = `https://<ref>.supabase.co/auth/v1/callback` | OK |
| Apple | Services ID + secret | iOS natif ; Android/web = OAuth navigateur |

## Message « Accès bloqué » (Google)

Causes fréquentes :
1. Redirect `pihpulse://auth/callback` **absent** de Supabase Redirect URLs  
2. Consent Google en mode **Testing** → ajoute ton Gmail comme test user  
3. Mauvais Client ID Web dans Supabase  
4. (Ancien bug app) injection du client_id Android — **corrigé**

## SHA-1 EAS (si un jour Google Sign-In natif Android)

```bash
# Fingerprint du keystore EAS (credentials)
npx eas-cli credentials -p android
```

Ajouter le SHA-1 dans Google Cloud → Client Android `com.ben229.PIHPULSE`.  
Pour le flux **navigateur Supabase** actuel, le Client Web suffit.

## Test

1. Build preview avec env Supabase  
2. Google / GitHub → navigateur → retour app  
3. Session → tabs ou profile-setup  
