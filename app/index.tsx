import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { hasCompletedOnboarding } from '../lib/onboarding';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Entry point cold start :
 * 0) Config Supabase manquante (EAS env) → écran d’aide
 * 1) Session Supabase ? → tabs
 * 2) Sinon onboarding déjà vu ? → login
 * 3) Sinon → onboarding (première ouverture)
 */
export default function EntryPoint() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isSupabaseConfigured) {
        router.replace('/config-error');
        return;
      }

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
