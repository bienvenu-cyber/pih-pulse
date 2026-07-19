/**
 * Palette unique pour les 3 flavors PIH Pulse.
 * Source de vérité UI — à utiliser via useThemeFlavor().
 *
 * IDs stables : `malt` | `dark` | `light`
 * (legacy storage `oled` → migré vers `dark`)
 */

export type ThemeFlavor = 'malt' | 'dark' | 'light';

export interface ThemeColors {
  /** Fond d'écran principal */
  bg: string;
  /** Surfaces / cartes */
  card: string;
  /** Header / nav bars */
  nav: string;
  /** Bordures */
  border: string;
  /** Texte principal */
  text: string;
  /** Texte secondaire / placeholders */
  textSecondary: string;
  /** Fond imbriqué (inputs, chips, avatars) */
  deep: string;
  /** CTA / accents */
  turmeric: string;
  kaki: string;
  corail: string;
  /** Header flottant (semi-transparent) */
  headerBg: string;
  /** Tab bar */
  tabBarBg: string;
  /** Texte sur bouton turmeric */
  onTurmeric: string;
  /** Fond bouton secondaire */
  buttonSecondary: string;
  /**
   * Barres de skeleton (shimmer) — doit rester lisible en mode clair
   * (jamais un gris/malt sombre collé sur fond papier).
   */
  skeleton: string;
}

/** Labels UI (Apparence) */
export const THEME_FLAVOR_LABELS: Record<ThemeFlavor, string> = {
  light: 'Clair',
  malt: 'Malt',
  dark: 'Sombre',
};

/** Thème par défaut (nouveaux installs + fallback) */
export const DEFAULT_THEME_FLAVOR: ThemeFlavor = 'light';

const LIGHT: ThemeColors = {
  bg: '#F8F5EC',
  card: '#FFFFFF',
  nav: '#F0EAD6',
  border: '#E6DCBD',
  text: '#0D0B05',
  textSecondary: '#705F40',
  deep: '#F0EAD6',
  turmeric: '#D9A000',
  kaki: '#5A9A58',
  corail: '#E8634A',
  headerBg: 'rgba(248, 245, 236, 0.92)',
  // Opaque tab bar — évite artefacts / ripple gris sur Android
  tabBarBg: '#F8F5EC',
  onTurmeric: '#0D0B05',
  buttonSecondary: '#F0EAD6',
  // Beige doux (pas de marron/malt sombre)
  skeleton: '#E8E0CC',
};

/** Ancien « OLED » — noir absolu, label UI « Sombre » */
const DARK: ThemeColors = {
  bg: '#000000',
  card: '#0A0A0A',
  nav: '#000000',
  border: '#1F1F1F',
  text: '#F5EDD6',
  textSecondary: '#A39171',
  deep: '#050505',
  turmeric: '#FFBE0B',
  kaki: '#7CB87A',
  corail: '#E8634A',
  headerBg: 'rgba(0, 0, 0, 0.82)',
  tabBarBg: '#000000',
  onTurmeric: '#0D0B05',
  buttonSecondary: '#0A0A0A',
  skeleton: '#1A1A1A',
};

const MALT: ThemeColors = {
  bg: '#0D0B05',
  card: '#18140B',
  nav: '#080703',
  border: '#261F12',
  text: '#F5EDD6',
  textSecondary: '#A39171',
  deep: '#0D0B05',
  turmeric: '#FFBE0B',
  kaki: '#7CB87A',
  corail: '#E8634A',
  headerBg: 'rgba(13, 11, 5, 0.84)',
  tabBarBg: '#080703',
  onTurmeric: '#0D0B05',
  buttonSecondary: '#0D0B05',
  skeleton: '#2A2418',
};

export function getThemeColors(flavor: ThemeFlavor): ThemeColors {
  if (flavor === 'light') return LIGHT;
  if (flavor === 'dark') return DARK;
  return MALT;
}

export function isThemeFlavor(val: string | null | undefined): val is ThemeFlavor {
  return val === 'malt' || val === 'dark' || val === 'light';
}

/**
 * Normalise une valeur stockée (inclut legacy `oled` → `dark`).
 */
export function normalizeThemeFlavor(val: string | null | undefined): ThemeFlavor | null {
  if (val === 'oled') return 'dark';
  if (isThemeFlavor(val)) return val;
  return null;
}
