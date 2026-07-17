import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

export type SkeletonVariant = 'card' | 'row' | 'detail' | 'profile' | 'form' | 'chat';

interface ListSkeletonProps {
  count?: number;
  /**
   * card = feed/projet/mission
   * row = talent/chat/notif
   * detail = écran détail hub
   * profile = hero profil
   * form = édition / settings
   * chat = thread messages
   */
  variant?: SkeletonVariant;
}

export function SkeletonBlock({
  width,
  height,
  radius = 8,
  style,
}: {
  width: number | string;
  height: number;
  radius?: number;
  style?: object;
}) {
  const { colors } = useThemeFlavor();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

function CardShell({ children }: { children: ReactNode }) {
  const { colors } = useThemeFlavor();
  return (
    <View
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
      className="border rounded-2xl p-4 gap-3"
    >
      {children}
    </View>
  );
}

/** Skeleton loading premium — listes & écrans data */
export default function ListSkeleton({
  count = 4,
  variant = 'card',
}: ListSkeletonProps) {
  const { colors } = useThemeFlavor();

  if (variant === 'row') {
    return (
      <View className="gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <View
            key={i}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="border rounded-2xl p-4 flex-row items-center gap-3"
          >
            <SkeletonBlock width={48} height={48} radius={24} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="55%" height={12} />
              <SkeletonBlock width="35%" height={10} />
            </View>
            <SkeletonBlock width={40} height={10} />
          </View>
        ))}
      </View>
    );
  }

  if (variant === 'detail') {
    return (
      <View className="gap-3 p-4">
        <CardShell>
          <SkeletonBlock width="40%" height={10} />
          <SkeletonBlock width="75%" height={20} />
          <SkeletonBlock width="100%" height={12} />
          <SkeletonBlock width="90%" height={12} />
          <SkeletonBlock width="55%" height={12} />
          <View className="flex-row gap-2 mt-1">
            <SkeletonBlock width={72} height={28} radius={14} />
            <SkeletonBlock width={72} height={28} radius={14} />
          </View>
        </CardShell>
        <CardShell>
          <SkeletonBlock width="30%" height={10} />
          <SkeletonBlock width="100%" height={12} />
          <SkeletonBlock width="100%" height={12} />
          <SkeletonBlock width="70%" height={12} />
        </CardShell>
        <CardShell>
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={40} height={40} radius={20} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="50%" height={12} />
              <SkeletonBlock width="35%" height={10} />
            </View>
          </View>
        </CardShell>
      </View>
    );
  }

  if (variant === 'profile') {
    return (
      <View className="gap-3 p-4">
        <CardShell>
          <View className="flex-row items-start gap-3.5">
            <SkeletonBlock width={72} height={72} radius={36} />
            <View className="flex-1 gap-2 pt-1">
              <SkeletonBlock width="60%" height={16} />
              <SkeletonBlock width="40%" height={10} />
              <SkeletonBlock width="70%" height={10} />
            </View>
          </View>
          <View className="flex-row gap-2 mt-2">
            <SkeletonBlock width="48%" height={40} radius={12} />
            <SkeletonBlock width="48%" height={40} radius={12} />
          </View>
        </CardShell>
        <View className="flex-row gap-2">
          <SkeletonBlock width="31%" height={64} radius={14} />
          <SkeletonBlock width="31%" height={64} radius={14} />
          <SkeletonBlock width="31%" height={64} radius={14} />
        </View>
        <CardShell>
          <SkeletonBlock width="40%" height={12} />
          <SkeletonBlock width="100%" height={44} radius={12} />
          <SkeletonBlock width="100%" height={44} radius={12} />
          <SkeletonBlock width="100%" height={44} radius={12} />
        </CardShell>
      </View>
    );
  }

  if (variant === 'form') {
    return (
      <View className="gap-4 p-4">
        <SkeletonBlock width="35%" height={12} />
        <SkeletonBlock width="100%" height={48} radius={12} />
        <SkeletonBlock width="35%" height={12} />
        <SkeletonBlock width="100%" height={48} radius={12} />
        <SkeletonBlock width="35%" height={12} />
        <SkeletonBlock width="100%" height={96} radius={12} />
        <SkeletonBlock width="100%" height={48} radius={14} />
      </View>
    );
  }

  if (variant === 'chat') {
    return (
      <View className="flex-1 px-4 py-6 gap-4">
        <View className="items-center gap-3 mb-4">
          <SkeletonBlock width={56} height={56} radius={28} />
          <SkeletonBlock width="40%" height={12} />
          <SkeletonBlock width="55%" height={10} />
        </View>
        {Array.from({ length: count }).map((_, i) => {
          const mine = i % 2 === 1;
          return (
            <View
              key={i}
              className={mine ? 'self-end items-end' : 'self-start items-start'}
              style={{ maxWidth: '78%', gap: 6 }}
            >
              <SkeletonBlock
                width={mine ? 180 : 200}
                height={44}
                radius={16}
              />
              <SkeletonBlock width={48} height={8} radius={4} />
            </View>
          );
        })}
      </View>
    );
  }

  // card (default) — feed / projets / missions
  return (
    <View className="gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="border rounded-2xl p-4 gap-3"
        >
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={40} height={40} radius={20} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="45%" height={12} />
              <SkeletonBlock width="70%" height={10} />
            </View>
          </View>
          <SkeletonBlock width="90%" height={14} />
          <SkeletonBlock width="100%" height={12} />
          <SkeletonBlock width="40%" height={10} />
        </View>
      ))}
    </View>
  );
}

/**
 * Plein écran data loading — header optionnel déjà monté par le parent.
 * Remplace les ActivityIndicator centrés pour les fetches initiaux.
 */
export function ScreenSkeleton({
  variant = 'detail',
  count,
  padded = true,
}: {
  variant?: SkeletonVariant;
  count?: number;
  padded?: boolean;
}) {
  const { colors } = useThemeFlavor();
  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.bg, padding: padded && variant !== 'detail' && variant !== 'profile' && variant !== 'form' && variant !== 'chat' ? 16 : 0 }}
    >
      <ListSkeleton variant={variant} count={count} />
    </View>
  );
}
