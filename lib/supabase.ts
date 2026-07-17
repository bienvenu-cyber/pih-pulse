import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

const customStorageAdapter = {
  getItem: (key: string) => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        return Promise.resolve(window.localStorage.getItem(key));
      }
      return Promise.resolve(null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (isWeb) {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

/**
 * URL / clé publiques Expo.
 * Sur EAS Build : définir EXPO_PUBLIC_* dans l’environnement preview/production
 * (sinon l’APK crashait avec « supabaseUrl is required »).
 */
export const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
export const supabaseAnonKey = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured =
  supabaseUrl.startsWith('http') && supabaseAnonKey.length > 20;

/**
 * Placeholder valide uniquement pour éviter un throw au createClient
 * si les env manquent — les appels API échoueront proprement.
 */
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.placeholder';

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] EXPO_PUBLIC_SUPABASE_URL / ANON_KEY manquants. ' +
      'Ajoute-les dans EAS (preview/production) ou dans .env local.'
  );
}

export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : FALLBACK_URL,
  isSupabaseConfigured ? supabaseAnonKey : FALLBACK_KEY,
  {
    auth: {
      storage: customStorageAdapter as any,
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: false,
    },
  }
);
