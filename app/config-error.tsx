/**
 * Écran affiché si le build n’a pas les variables Supabase (EAS env manquantes).
 */
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { isSupabaseConfigured } from '../lib/supabase';

export default function ConfigErrorScreen() {
  const { colors } = useThemeFlavor();

  if (isSupabaseConfigured) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="items-center justify-center px-8">
        <Text style={{ color: colors.text }} className="font-space text-lg font-bold text-center">
          Configuration OK
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} className="flex-1 px-8 justify-center gap-4">
      <Text style={{ color: colors.turmeric }} className="font-space text-2xl font-bold text-center">
        Configuration manquante
      </Text>
      <Text style={{ color: colors.text }} className="font-inter text-[14px] leading-6 text-center">
        Ce build n’a pas les clés Supabase. L’app ne peut pas démarrer correctement.
      </Text>
      <View
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
        className="border rounded-2xl p-4 gap-2"
      >
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[12px] leading-5">
          Sur expo.dev → projet PIH-PULSE → Environment variables, ajoute pour l’environnement{' '}
          <Text style={{ color: colors.turmeric }} className="font-bold">
            preview
          </Text>{' '}
          (et production) :
        </Text>
        <Text style={{ color: colors.text }} className="font-inter text-[11px] font-bold">
          EXPO_PUBLIC_SUPABASE_URL
        </Text>
        <Text style={{ color: colors.text }} className="font-inter text-[11px] font-bold">
          EXPO_PUBLIC_SUPABASE_ANON_KEY
        </Text>
        <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] leading-5 mt-2">
          Puis relance : npx eas-cli build --profile preview --platform android
        </Text>
      </View>
    </SafeAreaView>
  );
}
