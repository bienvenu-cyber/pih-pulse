import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { hasCompletedOnboarding } from '../lib/onboarding';
import { supabase } from '../lib/supabase';

/**
 * Entry point cold start :
 * 1) Session Supabase ? → tabs (utilisateur déjà connecté)
 * 2) Sinon onboarding déjà vu ? → login
 * 3) Sinon → onboarding (première ouverture)
 *
 * Splash natif Expo : affiché pendant le chargement des fonts (_layout),
 * puis cet écran (loader) le temps de résoudre la session.
 */
export default function EntryPoint() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          router.replace('/(tabs)');
          return;
        }

        const seen = await hasCompletedOnboarding();
        if (cancelled) return;

        router.replace(seen ? '/login' : '/onboarding');
      } catch {
        if (cancelled) return;
        try {
          const seen = await hasCompletedOnboarding();
          router.replace(seen ? '/login' : '/onboarding');
        } catch {
          router.replace('/onboarding');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <View
      style={{ backgroundColor: colors.bg }}
      className="flex-1 items-center justify-center"
    >
      <ActivityIndicator size="large" color={colors.turmeric} />
    </View>
  );
}
