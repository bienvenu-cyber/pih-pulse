import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import {
  DEFAULT_THEME_FLAVOR,
  getThemeColors,
  isThemeFlavor,
  normalizeThemeFlavor,
  type ThemeColors,
  type ThemeFlavor,
} from '../lib/theme';

const STORAGE_KEY = 'theme_flavor';
export const THEME_FLAVOR_CHANGED = 'THEME_FLAVOR_CHANGED';

async function readStoredFlavor(): Promise<ThemeFlavor | null> {
  try {
    const val =
      Platform.OS === 'web'
        ? typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEY)
          : null
        : await SecureStore.getItemAsync(STORAGE_KEY);
    const normalized = normalizeThemeFlavor(val);
    // Migration legacy oled → dark (réécrit en storage)
    if (val === 'oled' && normalized) {
      void persistFlavor(normalized);
    }
    return normalized;
  } catch {
    return null;
  }
}

async function persistFlavor(flavor: ThemeFlavor): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, flavor);
      }
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, flavor);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Applique le thème **immédiatement** (event UI), puis persiste en arrière-plan.
 */
export function applyThemeFlavor(flavor: ThemeFlavor): void {
  if (!isThemeFlavor(flavor)) return;
  DeviceEventEmitter.emit(THEME_FLAVOR_CHANGED, flavor);
  if (Platform.OS === 'web') {
    void persistFlavor(flavor);
    return;
  }
  void persistFlavor(flavor);
}

/**
 * Hook thème global — charge SecureStore/localStorage + écoute THEME_FLAVOR_CHANGED.
 * Défaut produit : **Clair** (`light`).
 */
export function useThemeFlavor(): {
  flavor: ThemeFlavor;
  colors: ThemeColors;
  isLight: boolean;
  /** true pour Malt ou Sombre (dark) */
  isDark: boolean;
  /** @deprecated alias isDark pour l’ex-OLED */
  isOled: boolean;
  setFlavor: (flavor: ThemeFlavor) => void;
} {
  const [flavor, setFlavorState] = useState<ThemeFlavor>(DEFAULT_THEME_FLAVOR);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const stored = await readStoredFlavor();
      if (mounted && stored) setFlavorState(stored);
    })();

    const sub = DeviceEventEmitter.addListener(THEME_FLAVOR_CHANGED, (next: string) => {
      const normalized = normalizeThemeFlavor(next);
      if (normalized) setFlavorState(normalized);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const setFlavor = useCallback((next: ThemeFlavor) => {
    applyThemeFlavor(next);
  }, []);

  const colors = useMemo(() => getThemeColors(flavor), [flavor]);
  const isLight = flavor === 'light';
  const isDark = !isLight;

  return {
    flavor,
    colors,
    isLight,
    isDark,
    isOled: flavor === 'dark',
    setFlavor,
  };
}
