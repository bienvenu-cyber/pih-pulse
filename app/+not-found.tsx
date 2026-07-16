import { Link, Stack } from 'expo-router';
import { Compass } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';

export default function NotFoundScreen() {
  const { colors } = useThemeFlavor();

  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Introuvable' }} />
      <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <View
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-16 h-16 rounded-2xl border items-center justify-center"
          >
            <Compass size={28} color={colors.turmeric} strokeWidth={1.8} />
          </View>
          <Text
            style={{ color: colors.text }}
            className="font-space text-xl font-bold text-center"
          >
            Page introuvable
          </Text>
          <Text
            style={{ color: colors.textSecondary }}
            className="font-inter text-sm text-center leading-5"
          >
            Cette route n’existe pas ou a été déplacée. Retourne au hub PIH Pulse.
          </Text>
          <Link href="/(tabs)" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retour au feed"
              className="bg-turmeric h-12 px-8 rounded-2xl items-center justify-center mt-2 active:opacity-90"
            >
              <Text className="text-malt-deep font-inter text-sm font-bold">
                Retour au feed
              </Text>
            </Pressable>
          </Link>
        </View>
      </SafeAreaView>
    </>
  );
}
