import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { supabase } from '../lib/supabase';

export default function EntryPoint() {
  const { colors } = useThemeFlavor();
  const router = useRouter();

  useEffect(() => {
    // Vérification de la session Supabase existante
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding');
      }
    }).catch(() => {
      router.replace('/onboarding');
    });
  }, []);

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color={colors.turmeric} />
    </View>
  );
}
