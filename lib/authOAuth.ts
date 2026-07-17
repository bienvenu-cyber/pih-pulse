/**
 * OAuth partagé (Google / GitHub / Apple) — login & register.
 *
 * Flux :
 * - Supabase signInWithOAuth + WebBrowser.openAuthSessionAsync
 * - Callback : PKCE `?code=` → exchangeCodeForSession
 *             ou tokens `#access_token=` → setSession
 * - Apple iOS : expo-apple-authentication + signInWithIdToken
 *
 * Redirect à déclarer dans Supabase Auth → URL Configuration :
 *   pihpulse://auth/callback
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

export type OAuthProvider = 'google' | 'github' | 'apple';

const PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: 'Google',
  github: 'GitHub',
  apple: 'Apple',
};

/** URI de retour stable (build standalone + dev client) */
export function getOAuthRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'pihpulse',
    path: 'auth/callback',
  });
}

/**
 * Extrait query + hash d’une URL de callback (custom scheme inclus).
 */
function parseCallbackParams(resultUrl: string): URLSearchParams {
  const params = new URLSearchParams();
  try {
    // Essai parser standard
    const u = new URL(resultUrl);
    u.searchParams.forEach((v, k) => params.set(k, v));
    if (u.hash && u.hash.length > 1) {
      const hashParams = new URLSearchParams(u.hash.replace(/^#/, ''));
      hashParams.forEach((v, k) => params.set(k, v));
    }
  } catch {
    // Fallback : pihpulse://... peut échouer sur d’anciens parsers
    const q = resultUrl.includes('?') ? resultUrl.split('?')[1]?.split('#')[0] || '' : '';
    const h = resultUrl.includes('#') ? resultUrl.split('#')[1] || '' : '';
    const raw = [q, h].filter(Boolean).join('&');
    raw.split('&').forEach((pair) => {
      const [k, ...rest] = pair.split('=');
      if (k) params.set(decodeURIComponent(k), decodeURIComponent(rest.join('=') || ''));
    });
  }
  return params;
}

/**
 * Établit la session Supabase à partir de l’URL de retour OAuth.
 */
export async function completeOAuthSession(
  resultUrl: string
): Promise<{ ok: true } | { error: string }> {
  const params = parseCallbackParams(resultUrl);

  const providerError =
    params.get('error_description') ||
    params.get('error') ||
    params.get('message');
  if (providerError) {
    console.warn('[oauth] provider error:', providerError);
    return {
      error: decodeURIComponent(providerError.replace(/\+/g, ' ')),
    };
  }

  // 1) PKCE (défaut supabase-js récent)
  const code = params.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.warn('[oauth] exchangeCodeForSession:', error.message);
      return { error: error.message || 'Échange de code OAuth échoué.' };
    }
    if (data.session) return { ok: true };
  }

  // 2) Tokens implicites (hash ou query)
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token') || '';
  if (accessToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.warn('[oauth] setSession:', error.message);
      return { error: error.message || 'Session OAuth impossible.' };
    }
    return { ok: true };
  }

  // 3) Session déjà posée par le client
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return { ok: true };

  return {
    error:
      'Session non établie. Vérifie les Redirect URLs Supabase (pihpulse://auth/callback).',
  };
}

async function signInWithAppleNative(): Promise<{ ok: true } | { error: string }> {
  try {
    const available = await AppleAuthentication.isAvailableAsync();
    if (!available) {
      return { error: 'Apple Sign-In non disponible sur cet appareil.' };
    }

    const rawNonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      return { error: 'Token Apple manquant.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      console.warn('[apple] id_token:', error.message);
      return { error: error.message || 'Connexion Apple impossible.' };
    }
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED' || e?.code === 'ERR_CANCELED') {
      return { error: 'Connexion annulée.' };
    }
    console.error('Apple native error:', e);
    return { error: e?.message || 'Erreur Apple Sign-In.' };
  }
}

export async function signInWithOAuthProvider(
  provider: OAuthProvider
): Promise<{ ok: true } | { error: string }> {
  // Apple iOS : flux natif
  if (provider === 'apple' && Platform.OS === 'ios') {
    return signInWithAppleNative();
  }

  // Apple hors iOS : OAuth navigateur Supabase (pas de Sign in with Apple natif)
  try {
    const redirectUri = getOAuthRedirectUri();
    console.log('[oauth] redirectUri=', redirectUri, 'provider=', provider);

    /**
     * Important : ne PAS forcer client_id Google Android/iOS ici.
     * Supabase utilise le Client ID **Web** configuré dans le dashboard.
     * Injecter un client Android cassait souvent « Accès bloqué » / invalid_request.
     */
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUri,
        skipBrowserRedirect: true,
        queryParams:
          provider === 'google'
            ? {
                // UX : forcer le choix de compte
                prompt: 'select_account',
              }
            : undefined,
      },
    });

    if (error) {
      console.warn('[oauth] signInWithOAuth:', error.message);
      return {
        error:
          error.message ||
          `Impossible d’initialiser ${PROVIDER_LABEL[provider]}. Active le provider dans Supabase Auth.`,
      };
    }

    if (!data?.url) {
      return {
        error: `URL OAuth manquante pour ${PROVIDER_LABEL[provider]}. Vérifie Supabase → Authentication → Providers.`,
      };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: 'Connexion annulée.' };
    }
    if (result.type !== 'success' || !('url' in result) || !result.url) {
      return { error: 'Connexion annulée.' };
    }

    return completeOAuthSession(result.url);
  } catch (e: any) {
    console.error(`${provider} OAuth error:`, e);
    return {
      error: e?.message || `Erreur ${PROVIDER_LABEL[provider]}.`,
    };
  }
}

/** Après auth : profile-setup si pas de rôle, sinon feed */
export async function routeAfterAuth(): Promise<'/profile-setup' | '/(tabs)'> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return '/(tabs)';
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();
  // role a une valeur par défaut 'developer' au signup — considérer setup si bio/skills vides
  if (!profile) return '/profile-setup';
  const needsSetup =
    !profile.role ||
    // si le trigger a mis developer par défaut, on laisse passer tabs
    false;
  if (needsSetup) return '/profile-setup';
  return '/(tabs)';
}
