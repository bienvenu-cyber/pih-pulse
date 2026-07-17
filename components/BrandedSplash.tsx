import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';

/**
 * Splash premium PIH Pulse (runtime JS) :
 * - logo Élan centré
 * - « from Beyond » en bas
 *
 * Spec régénération icônes / splash : docs/SPLASH.md
 * Suit le mode système (clair/sombre) +, si déjà choisi, le theme_flavor app
 * (light → clair ; malt/oled → sombre).
 */
export function BrandedSplash() {
  const system = useColorScheme();
  const insets = useSafeAreaInsets();
  const [flavor, setFlavor] = useState<'malt' | 'oled' | 'light' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const val =
          Platform.OS === 'web'
            ? localStorage.getItem('theme_flavor')
            : await SecureStore.getItemAsync('theme_flavor');
        if (!cancelled && (val === 'oled' || val === 'malt' || val === 'light')) {
          setFlavor(val);
        }
      } catch {
        // ignore — on retombe sur le mode système
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isLight =
    flavor === 'light' || (flavor == null && system === 'light');

  const bg = isLight ? '#F8F5EC' : '#0D0B05';
  const fromColor = '#A39171';
  const brandColor = isLight ? '#0D0B05' : '#F5EDD6';

  return (
    <View className="flex-1" style={{ backgroundColor: bg }} accessibilityLabel="PIH Pulse, from Beyond">
      {/* Zone logo — centrée verticalement (optique un peu au-dessus du milieu) */}
      <View className="flex-1 items-center justify-center" style={{ paddingBottom: 40 }}>
        <Image
          source={require('../assets/images/icon.png')}
          style={{ width: 120, height: 120, borderRadius: 60 }}
          contentFit="cover"
          transition={0}
        />
      </View>

      <View
        className="items-center"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 20 }}
      >
        <Text
          style={{
            color: fromColor,
            fontSize: 13,
            fontWeight: '500',
            letterSpacing: 0.6,
            marginBottom: 4,
          }}
        >
          from
        </Text>
        <Text
          style={{
            color: brandColor,
            fontSize: 17,
            fontWeight: '600',
            letterSpacing: 0.4,
          }}
        >
          Beyond
        </Text>
      </View>
    </View>
  );
}
