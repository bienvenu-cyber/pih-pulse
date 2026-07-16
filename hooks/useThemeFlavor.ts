import * as SecureStore from 'expo-secure-store';
import { useEffect, useMemo, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import {
  getThemeColors,
  isThemeFlavor,
  type ThemeColors,
  type ThemeFlavor,
} from '../lib/theme';

const STORAGE_KEY = 'theme_flavor';

async function readStoredFlavor(): Promise<ThemeFlavor | null> {
  try {
    const val =
      Platform.OS === 'web'
        ? typeof window !== 'undefined'
          ? window.localStorage.getItem(STORAGE_KEY)
          : null
        : await SecureStore.getItemAsync(STORAGE_KEY);
    return isThemeFlavor(val) ? val : null;
  } catch {
    return null;
  }
}

/**
 * Hook thème global — charge SecureStore/localStorage + écoute THEME_FLAVOR_CHANGED.
 */
export function useThemeFlavor(): {
  flavor: ThemeFlavor;
  colors: ThemeColors;
  isLight: boolean;
  isOled: boolean;
} {
  const [flavor, setFlavor] = useState<ThemeFlavor>('malt');

  useEffect(() => {
    let mounted = true;

    (async () => {
      const stored = await readStoredFlavor();
      if (mounted && stored) setFlavor(stored);
    })();

    const sub = DeviceEventEmitter.addListener('THEME_FLAVOR_CHANGED', (next: string) => {
      if (isThemeFlavor(next)) setFlavor(next);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const colors = useMemo(() => getThemeColors(flavor), [flavor]);

  return {
    flavor,
    colors,
    isLight: flavor === 'light',
    isOled: flavor === 'oled',
  };
}
