import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import SoftSurface from './SoftSurface';

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
  const { colors, isLight } = useThemeFlavor();
  const opacity = useRef(new Animated.Value(isLight ? 0.55 : 0.4)).current;

  useEffect(() => {
    const low = isLight ? 0.45 : 0.35;
    const high = isLight ? 0.95 : 0.75;
    opacity.setValue(low);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: high,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: low,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, isLight]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          // Couleur dédiée (clair = beige doux, jamais malt sombre)
          backgroundColor: colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  );
}

function CardShell({ children, className = 'p-4 gap-3' }: { children: ReactNode; className?: string }) {
  return (
    <SoftSurface className={className}>
      {children}
    </SoftSurface>
  );
}

/** Skeleton loading premium — listes & écrans data */
export default function ListSkeleton({
  count = 4,
  variant = 'card',
}: ListSkeletonProps) {
  const { colors } = useThemeFlavor();

  if (variant === 'row') {
    // Notifs / talents / chat — carte claire + barres soft
    return (
      <View className="gap-2.5">
        {Array.from({ length: count }).map((_, i) => (
          <SoftSurface
            key={i}
            variant="row"
            className="px-3.5 py-3.5 flex-row items-center gap-3"
          >
            <SkeletonBlock width={44} height={44} radius={22} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="52%" height={12} radius={6} />
              <SkeletonBlock width="78%" height={10} radius={5} />
            </View>
            <SkeletonBlock width={36} height={9} radius={4} />
          </SoftSurface>
        ))}
      </View>
    );
  }

  if (variant === 'detail') {
    // Fiche projet / mission / post / event — layout premium complet
    return (
      <View className="gap-3 p-4">
        {/* Hero titre + meta */}
        <CardShell>
          <View className="flex-row items-center gap-2">
            <SkeletonBlock width={64} height={22} radius={11} />
            <SkeletonBlock width={48} height={22} radius={11} />
          </View>
          <SkeletonBlock width="88%" height={22} radius={8} />
          <SkeletonBlock width="62%" height={14} radius={6} />
          <View className="gap-2 mt-1">
            <SkeletonBlock width="100%" height={11} radius={5} />
            <SkeletonBlock width="96%" height={11} radius={5} />
            <SkeletonBlock width="72%" height={11} radius={5} />
          </View>
          <View className="flex-row gap-2 mt-1">
            <SkeletonBlock width={70} height={28} radius={14} />
            <SkeletonBlock width={70} height={28} radius={14} />
            <SkeletonBlock width={70} height={28} radius={14} />
          </View>
        </CardShell>

        {/* Auteur / lead */}
        <CardShell>
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={44} height={44} radius={22} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="48%" height={13} radius={6} />
              <SkeletonBlock width="34%" height={10} radius={5} />
            </View>
            <SkeletonBlock width={72} height={32} radius={16} />
          </View>
        </CardShell>

        {/* Section contenu */}
        <CardShell>
          <SkeletonBlock width="30%" height={12} radius={6} />
          <SkeletonBlock width="100%" height={11} radius={5} />
          <SkeletonBlock width="100%" height={11} radius={5} />
          <SkeletonBlock width="58%" height={11} radius={5} />
        </CardShell>

        {/* CTA bas */}
        <SkeletonBlock width="100%" height={48} radius={16} />
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
              <SkeletonBlock width="58%" height={16} radius={7} />
              <SkeletonBlock width="36%" height={10} radius={5} />
              <SkeletonBlock width="48%" height={10} radius={5} />
            </View>
            <SkeletonBlock width={52} height={28} radius={8} />
          </View>
          <View
            className="flex-row mt-3 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View key={i} className="flex-1 items-center gap-1.5">
                <SkeletonBlock width={28} height={14} radius={6} />
                <SkeletonBlock width={36} height={8} radius={4} />
              </View>
            ))}
          </View>
        </CardShell>
        <CardShell>
          <SkeletonBlock width="28%" height={12} radius={6} />
          <SkeletonBlock width="100%" height={12} radius={5} />
          <SkeletonBlock width="88%" height={12} radius={5} />
          <View className="flex-row gap-1.5 mt-1">
            <SkeletonBlock width={64} height={24} radius={12} />
            <SkeletonBlock width={56} height={24} radius={12} />
            <SkeletonBlock width={72} height={24} radius={12} />
          </View>
        </CardShell>
        <CardShell>
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={36} height={36} radius={10} />
            <View className="flex-1 gap-1.5">
              <SkeletonBlock width="42%" height={12} radius={6} />
              <SkeletonBlock width="62%" height={10} radius={5} />
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={36} height={36} radius={10} />
            <View className="flex-1 gap-1.5">
              <SkeletonBlock width="48%" height={12} radius={6} />
              <SkeletonBlock width="55%" height={10} radius={5} />
            </View>
          </View>
        </CardShell>
      </View>
    );
  }

  if (variant === 'form') {
    return (
      <View className="gap-4 p-4">
        <SkeletonBlock width="35%" height={12} radius={6} />
        <SkeletonBlock width="100%" height={48} radius={14} />
        <SkeletonBlock width="35%" height={12} radius={6} />
        <SkeletonBlock width="100%" height={48} radius={14} />
        <SkeletonBlock width="35%" height={12} radius={6} />
        <SkeletonBlock width="100%" height={96} radius={14} />
        <SkeletonBlock width="100%" height={48} radius={14} />
      </View>
    );
  }

  if (variant === 'chat') {
    return (
      <View className="flex-1 px-4 py-6 gap-4">
        <View className="items-center gap-3 mb-4">
          <SkeletonBlock width={56} height={56} radius={28} />
          <SkeletonBlock width="40%" height={12} radius={6} />
          <SkeletonBlock width="55%" height={10} radius={5} />
        </View>
        {Array.from({ length: count }).map((_, i) => {
          const mine = i % 2 === 1;
          return (
            <View
              key={i}
              className={mine ? 'self-end items-end' : 'self-start items-start'}
              style={{ maxWidth: '78%', gap: 6 }}
            >
              <SkeletonBlock width={mine ? 180 : 200} height={44} radius={16} />
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
        <SoftSurface
          key={i}
          className="p-4 gap-3"
        >
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={40} height={40} radius={20} />
            <View className="flex-1 gap-2">
              <SkeletonBlock width="45%" height={12} radius={6} />
              <SkeletonBlock width="70%" height={10} radius={5} />
            </View>
          </View>
          <SkeletonBlock width="90%" height={14} radius={6} />
          <SkeletonBlock width="100%" height={12} radius={5} />
          <SkeletonBlock width="40%" height={10} radius={5} />
        </SoftSurface>
      ))}
    </View>
  );
}

/**
 * Plein écran data loading — header optionnel déjà monté par le parent.
 * Fond toujours `colors.bg` (suit le thème clair/sombre).
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
  const needsOuterPad =
    padded &&
    variant !== 'detail' &&
    variant !== 'profile' &&
    variant !== 'form' &&
    variant !== 'chat';

  return (
    <View
      className="flex-1"
      style={{ backgroundColor: colors.bg, padding: needsOuterPad ? 16 : 0 }}
    >
      <ListSkeleton variant={variant} count={count} />
    </View>
  );
}
