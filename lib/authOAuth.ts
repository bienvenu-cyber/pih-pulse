/**
 * OAuth partagé (Google / GitHub / Apple) — login & register.
 * Apple : expo-apple-authentication sur iOS natif, sinon OAuth web Supabase.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID_ANDROID =
  '28246710238-kk9b3s7depknr7p9n0sbavrcpcql01e3.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_IOS =
  '28246710238-vb0vfusooed97smia5tuqomoqvonm3cs.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID_WEB =
  '28246710238-2u40650vrnd8oteftorim7i433onbg5d.apps.googleusercontent.com';

export type OAuthProvider = 'google' | 'github' | 'apple';

export async function completeOAuthSession(resultUrl: string): Promise<boolean> {
  const accessToken =
    (() => {
      try {
        return new URL(resultUrl).searchParams.get('access_token');
      } catch {
        return null;
      }
    })() || resultUrl.match(/access_token=([^&]+)/)?.[1];
  const refreshToken =
    (() => {
      try {
        return new URL(resultUrl).searchParams.get('refresh_token');
      } catch {
        return null;
      }
    })() || resultUrl.match(/refresh_token=([^&]+)/)?.[1];

  if (accessToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken || '',
    });
    if (error) return false;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
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
  // Apple iOS : flux natif (meilleure UX store)
  if (provider === 'apple' && Platform.OS === 'ios') {
    return signInWithAppleNative();
  }

  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'pihpulse',
      path: 'auth/callback',
    });

    const options: any = {
      redirectTo: redirectUri,
      skipBrowserRedirect: true,
    };

    if (provider === 'google') {
      const clientId = Platform.select({
        ios: GOOGLE_CLIENT_ID_IOS,
        android: GOOGLE_CLIENT_ID_ANDROID,
        default: GOOGLE_CLIENT_ID_WEB,
      })!;
      options.queryParams = {
        client_id: clientId,
        access_type: 'offline',
        prompt: 'consent',
      };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options,
    });

    if (error || !data?.url) {
      const labels: Record<OAuthProvider, string> = {
        google: 'Google',
        github: 'GitHub',
        apple: 'Apple',
      };
      return {
        error: `Impossible d’initialiser ${labels[provider]}. Vérifie la config Supabase Auth.`,
      };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);
    if (result.type !== 'success' || !result.url) {
      return { error: 'Connexion annulée.' };
    }

    const ok = await completeOAuthSession(result.url);
    if (!ok) return { error: 'Session non établie. Réessaie.' };
    return { ok: true };
  } catch (e) {
    console.error(`${provider} OAuth error:`, e);
    const labels: Record<OAuthProvider, string> = {
      google: 'Google',
      github: 'GitHub',
      apple: 'Apple',
    };
    return { error: `Erreur ${labels[provider]}.` };
  }
}

/** Après OAuth : profile-setup si pas de rôle, sinon feed */
export async function routeAfterAuth(): Promise<'/profile-setup' | '/(tabs)'> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return '/(tabs)';
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  if (!profile?.role) return '/profile-setup';
  return '/(tabs)';
}
