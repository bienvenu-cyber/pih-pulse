# Réinitialisation du mot de passe (code OTP)

L’app utilise un flux **100 % code de confirmation** (pas de lien magique côté mobile) :

1. Login → **Oublié ?** → `/forgot-password`
2. Saisie e-mail → `supabase.auth.resetPasswordForEmail(email)`
3. `/reset-password` → saisie du **code** (6–8 chiffres, souvent 8) → `verifyOtp({ type: 'recovery' })`
4. Nouveau mot de passe → `updateUser({ password })` → déconnexion → Login

---

## Configuration Supabase obligatoire (template e-mail)

Par défaut, le template **Reset Password** de Supabase envoie un **lien**.  
Pour que l’utilisateur reçoive un **code**, modifie le template :

**Dashboard Supabase → Authentication → Email Templates → Reset Password**

### Exemple de corps (recommandé)

```html
<h2>Réinitialisation — PIH Pulse</h2>
<p>Voici votre code de confirmation :</p>
<p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">
  {{ .Token }}
</p>
<p>Ce code expire dans 1 heure. Si vous n’êtes pas à l’origine de cette demande, ignorez cet e-mail.</p>
```

### Variables utiles

| Variable | Rôle |
|----------|------|
| `{{ .Token }}` | **Code OTP** (celui saisi dans l’app) |
| `{{ .ConfirmationURL }}` | Lien magique (optionnel, inutile pour l’app) |
| `{{ .Email }}` | E-mail du destinataire |

Tu peux laisser le lien dans l’e-mail pour le web, mais **affiche clairement `{{ .Token }}`** pour l’app mobile.

---

## Paramètres Auth recommandés

**Authentication → Providers → Email**

- Confirm email : selon ta politique (déjà utilisé pour l’inscription)
- Secure email change : optionnel

**Authentication → Rate Limits**

- Surveille les limites d’envoi d’e-mails (le renvoi dans l’app a un cooldown 60 s)

---

## Tests manuels

1. Compte existant avec mot de passe  
2. Login → Oublié ? → e-mail  
3. Ouvrir la boîte mail → copier le **code** (pas le lien)  
4. Saisir le code → nouveau MDP (min. 8 car.) → confirmer  
5. Se connecter avec le nouveau mot de passe  
6. Tester « Renvoyer le code » après le cooldown  

---

## Dépannage

| Symptôme | Cause probable |
|----------|----------------|
| « Code incorrect » | Template sans `{{ .Token }}` / mauvais type / code expiré |
| E-mail non reçu | Spams, rate limit, SMTP Supabase, e-mail inexistant (message volontairement neutre) |
| « Session expirée » à l’étape MDP | Trop de temps après le OTP → recommencer |
| Lien dans l’e-mail seulement | Template non mis à jour (voir ci-dessus) |
