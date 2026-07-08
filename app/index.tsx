import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function EntryPoint() {
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
    <View className="flex-1 bg-malt-deep items-center justify-center">
      <ActivityIndicator size="large" color="#FFBE0B" />
    </View>
  );
}
