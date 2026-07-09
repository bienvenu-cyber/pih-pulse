import '../global.css';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { DeviceEventEmitter, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { 
  SpaceGrotesk_500Medium, 
  SpaceGrotesk_700Bold 
} from '@expo-google-fonts/space-grotesk';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_600SemiBold, 
  Inter_700Bold 
} from '@expo-google-fonts/inter';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const stability = 'stable';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const [themeFlavor, setThemeFlavor] = useState<'malt' | 'oled' | 'light'>('malt');

  useEffect(() => {
    // Load saved theme flavor safely (web compatibility)
    async function loadSavedTheme() {
      try {
        const val = Platform.OS === 'web'
          ? localStorage.getItem('theme_flavor')
          : await SecureStore.getItemAsync('theme_flavor');
        if (val === 'oled' || val === 'malt' || val === 'light') {
          setThemeFlavor(val as any);
        }
      } catch (e) {
        console.warn('Could not load theme flavor:', e);
      }
    }
    loadSavedTheme();

    // Listen for changes
    const sub = DeviceEventEmitter.addListener('THEME_FLAVOR_CHANGED', (flavor) => {
      if (flavor === 'oled' || flavor === 'malt' || flavor === 'light') {
        setThemeFlavor(flavor);
      }
    });

    return () => sub.remove();
  }, []);

  const isLight = themeFlavor === 'light';

  const activeDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: isLight ? '#F8F5EC' : (themeFlavor === 'oled' ? '#000000' : '#0D0B05'),
      card: isLight ? '#F0EAD6' : (themeFlavor === 'oled' ? '#0A0A0A' : '#080703'),
      text: isLight ? '#0D0B05' : '#F5EDD6',
      border: isLight ? '#E6DCBD' : (themeFlavor === 'oled' ? '#1F1F1F' : '#261F12'),
    }
  };

  const activeDefaultTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: isLight ? '#F8F5EC' : (themeFlavor === 'oled' ? '#000000' : '#0D0B05'),
      card: isLight ? '#F0EAD6' : (themeFlavor === 'oled' ? '#0A0A0A' : '#080703'),
      text: isLight ? '#0D0B05' : '#F5EDD6',
      border: isLight ? '#E6DCBD' : (themeFlavor === 'oled' ? '#1F1F1F' : '#261F12'),
    }
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? activeDarkTheme : activeDefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="verify-otp" options={{ headerShown: false }} />
        <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="project/create" options={{ headerShown: false }} />
        <Stack.Screen name="mission/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="mission/create" options={{ headerShown: false }} />
        <Stack.Screen name="profile/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="chat/index" options={{ headerShown: false }} />
        <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
