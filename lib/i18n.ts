/**
 * i18n léger PIH Pulse — FR (défaut) / EN.
 * Locale stockée dans profiles.preferred_locale + SecureStore/localStorage.
 * Étend `MESSAGES` progressivement ; pas de lib externe pour l’instant.
 */
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type AppLocale = 'fr' | 'en';

const STORAGE_KEY = 'pih_locale';

type MessageKey =
  | 'tabs.feed'
  | 'tabs.projects'
  | 'tabs.missions'
  | 'tabs.talents'
  | 'tabs.profile'
  | 'common.back'
  | 'common.save'
  | 'common.cancel'
  | 'common.retry'
  | 'common.loading'
  | 'auth.login'
  | 'auth.register'
  | 'auth.logout'
  | 'settings.language'
  | 'settings.push'
  | 'empty.noResults'
  | 'notFound.title'
  | 'notFound.body'
  | 'notFound.cta';

const MESSAGES: Record<AppLocale, Record<MessageKey, string>> = {
  fr: {
    'tabs.feed': 'Feed',
    'tabs.projects': 'Projets',
    'tabs.missions': 'Missions',
    'tabs.talents': 'Talents',
    'tabs.profile': 'Profil',
    'common.back': 'Retour',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.retry': 'Réessayer',
    'common.loading': 'Chargement…',
    'auth.login': 'Connexion',
    'auth.register': 'Inscription',
    'auth.logout': 'Se déconnecter',
    'settings.language': 'Langue',
    'settings.push': 'Notifications',
    'empty.noResults': 'Aucun résultat',
    'notFound.title': 'Page introuvable',
    'notFound.body': 'Cette route n’existe pas ou a été déplacée.',
    'notFound.cta': 'Retour au feed',
  },
  en: {
    'tabs.feed': 'Feed',
    'tabs.projects': 'Projects',
    'tabs.missions': 'Missions',
    'tabs.talents': 'Talents',
    'tabs.profile': 'Profile',
    'common.back': 'Back',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.retry': 'Retry',
    'common.loading': 'Loading…',
    'auth.login': 'Sign in',
    'auth.register': 'Sign up',
    'auth.logout': 'Sign out',
    'settings.language': 'Language',
    'settings.push': 'Notifications',
    'empty.noResults': 'No results',
    'notFound.title': 'Page not found',
    'notFound.body': 'This route does not exist or was moved.',
    'notFound.cta': 'Back to feed',
  },
};

let currentLocale: AppLocale = 'fr';

export function getLocale(): AppLocale {
  return currentLocale;
}

export function setLocaleMemory(locale: AppLocale) {
  currentLocale = locale;
}

export async function loadStoredLocale(): Promise<AppLocale> {
  try {
    const raw =
      Platform.OS === 'web'
        ? localStorage.getItem(STORAGE_KEY)
        : await SecureStore.getItemAsync(STORAGE_KEY);
    if (raw === 'en' || raw === 'fr') {
      currentLocale = raw;
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'fr';
}

export async function persistLocale(locale: AppLocale): Promise<void> {
  currentLocale = locale;
  try {
    if (Platform.OS === 'web') localStorage.setItem(STORAGE_KEY, locale);
    else await SecureStore.setItemAsync(STORAGE_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Traduction (fallback FR si clé manquante) */
export function t(key: MessageKey, locale: AppLocale = currentLocale): string {
  return MESSAGES[locale]?.[key] ?? MESSAGES.fr[key] ?? key;
}

export function availableLocales(): { id: AppLocale; label: string }[] {
  return [
    { id: 'fr', label: 'Français' },
    { id: 'en', label: 'English' },
  ];
}
