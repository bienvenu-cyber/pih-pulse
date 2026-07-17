import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { BrandedSplash } from '../components/BrandedSplash';
import { hasCompletedOnboarding } from '../lib/onboarding';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

/**
 * Entry point cold start :
 * 0) Config Supabase manquante (EAS env) → écran d’aide
 * 1) Session Supabase ? → tabs
 * 2) Sinon onboarding déjà vu ? → login
 * 3) Sinon → onboarding (première ouverture)
 *
 * Affiche BrandedSplash (logo + from Beyond) jusqu’à la décision de route.
 */
export default function EntryPoint() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Premier frame JS : on peut retirer le splash natif (logo seul),
      // le branding « from Beyond » est déjà affiché en JS.
      SplashScreen.hideAsync().catch(() => {});

      const finish = async (href: string) => {
        if (cancelled) return;
        router.replace(href as any);
      };

      if (!isSupabaseConfigured) {
        await finish('/config-error');
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (cancelled) return;

        if (session) {
          await finish('/(tabs)');
          return;
        }

        const seen = await hasCompletedOnboarding();
        if (cancelled) return;

        await finish(seen ? '/login' : '/onboarding');
      } catch {
        if (cancelled) return;
        try {
          const seen = await hasCompletedOnboarding();
          await finish(seen ? '/login' : '/onboarding');
        } catch {
          await finish('/onboarding');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return <BrandedSplash />;
}
