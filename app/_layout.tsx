import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold
} from '@expo-google-fonts/space-grotesk';
import {
  DEFAULT_THEME_FLAVOR,
  getThemeColors,
  normalizeThemeFlavor,
  type ThemeFlavor,
} from '../lib/theme';
import { supabase } from '../lib/supabase';

import * as Notifications from 'expo-notifications';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary
} from 'expo-router';

export const stability = 'stable';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Garde le splash natif jusqu’à fonts + premier paint (évite écran blanc / flash).
SplashScreen.preventAutoHideAsync().catch(() => {
  // no-op si déjà géré par le runtime
});

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceGrotesk500: SpaceGrotesk_500Medium,
    SpaceGrotesk700: SpaceGrotesk_700Bold,
    Inter400: Inter_400Regular,
    Inter500: Inter_500Medium,
    Inter600: Inter_600SemiBold,
    Inter700: Inter_700Bold,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded) return;
    // Filet de sécurité (deep link / route hors index) : ne jamais coller le splash natif.
    const t = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(t);
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const [themeFlavor, setThemeFlavor] = useState<ThemeFlavor>(DEFAULT_THEME_FLAVOR);
  const router = useRouter();

  useEffect(() => {
    // Listener de session — redirige vers /login si la session expire ou est révoquée
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        router.replace('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Deep linking au tap sur une notif push native
    if (Platform.OS === 'web') return;
    try {
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response?.notification?.request?.content?.data;
        const route = data?.route;
        if (typeof route === 'string' && route.startsWith('/')) {
          router.push(route as any);
        }
      });
      return () => sub.remove();
    } catch (e) {
      console.warn('[push tap listener]', e);
    }
  }, [router]);

  useEffect(() => {
    async function loadSavedTheme() {
      try {
        const val =
          Platform.OS === 'web'
            ? localStorage.getItem('theme_flavor')
            : await SecureStore.getItemAsync('theme_flavor');
        const normalized = normalizeThemeFlavor(val);
        if (normalized) setThemeFlavor(normalized);
      } catch (e) {
        console.warn('Could not load theme flavor:', e);
      }
    }
    loadSavedTheme();

    const sub = DeviceEventEmitter.addListener('THEME_FLAVOR_CHANGED', (flavor) => {
      const normalized = normalizeThemeFlavor(flavor);
      if (normalized) setThemeFlavor(normalized);
    });

    return () => sub.remove();
  }, []);

  const isLight = themeFlavor === 'light';
  const c = getThemeColors(themeFlavor);

  // Thème navigation = flavor app (pas le mode système) → ripple Android correct
  const navTheme = {
    ...(isLight ? DefaultTheme : DarkTheme),
    dark: !isLight,
    colors: {
      ...(isLight ? DefaultTheme.colors : DarkTheme.colors),
      primary: c.turmeric,
      background: c.bg,
      card: c.nav,
      text: c.text,
      border: c.border,
      notification: c.turmeric,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="config-error" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="project/create" options={{ headerShown: false }} />
        <Stack.Screen name="project/edit" options={{ headerShown: false }} />
        <Stack.Screen name="legal/privacy" options={{ headerShown: false }} />
        <Stack.Screen name="mission/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="mission/create" options={{ headerShown: false }} />
        <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="post/create" options={{ headerShown: false }} />
        <Stack.Screen name="post/edit" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ headerShown: false }} />
        <Stack.Screen name="profile/security" options={{ headerShown: false }} />
        <Stack.Screen name="profile/portfolio" options={{ headerShown: false }} />
        <Stack.Screen name="profile/impact" options={{ headerShown: false }} />
        <Stack.Screen name="profile/settings" options={{ headerShown: false }} />
        <Stack.Screen name="chat/index" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
