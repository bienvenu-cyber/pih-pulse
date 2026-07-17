/**
 * Onboarding = première ouverture (ou après clear data).
 * Flag local, indépendant de la session Supabase.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'pih_onboarding_done';

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.localStorage) return false;
      return window.localStorage.getItem(KEY) === '1';
    }
    const v = await SecureStore.getItemAsync(KEY);
    return v === '1';
  } catch {
    return false;
  }
}

export async function markOnboardingDone(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(KEY, '1');
      }
      return;
    }
    await SecureStore.setItemAsync(KEY, '1');
  } catch (e) {
    console.warn('[onboarding] mark failed:', e);
  }
}
