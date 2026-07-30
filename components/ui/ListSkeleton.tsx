import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import SoftSurface from './SoftSurface';

export type SkeletonVariant = 'card' | 'row' | 'detail' | 'profile' | 'form' | 'chat';

interface ListSkeletonProps {
  count?: number;
  /**
   * card = feed/projet/mission
   * row = talent/chat/notif
   * detail = écran détail hub
   * profile = hero profil (onglet + fiche publique)
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
  /** Dans un flex-row : occupe l’espace restant (largeur). Ne pas utiliser en colonne. */
  rowFlex,
  /** Dans une colonne : s’étire en largeur sans casser la hauteur. */
  stretch,
}: {
  width?: number | `${number}%`;
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  rowFlex?: number;
  stretch?: boolean;
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

  const sizeStyle: ViewStyle = rowFlex != null
    ? { flex: rowFlex, minWidth: 0, height }
    : stretch || width == null
      ? { alignSelf: 'stretch', height }
      : { width, height };

  return (
    <Animated.View
      style={[
        {
          borderRadius: radius,
          backgroundColor: colors.skeleton,
          opacity,
          ...sizeStyle,
        },
        style,
      ]}
    />
  );
}

function CardShell({
  children,
  className = 'p-4 gap-3',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <SoftSurface className={className}>{children}</SoftSurface>;
}

/** Ligne d’identité (nom / username / meta) — stretch dans flex-1 pour ne pas déborder le hero */
function IdentityLines() {
  return (
    <View className="flex-1 gap-1.5 pt-1 pr-1" style={{ minWidth: 0 }}>
      <SkeletonBlock stretch height={16} radius={7} style={{ maxWidth: 160 }} />
      <SkeletonBlock width={88} height={10} radius={5} />
      <SkeletonBlock width={112} height={10} radius={5} />
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
            <View className="flex-1 gap-2" style={{ minWidth: 0 }}>
              <SkeletonBlock width={120} height={12} radius={6} />
              <SkeletonBlock stretch height={10} radius={5} style={{ maxWidth: '90%' }} />
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
        <CardShell>
          <View className="flex-row items-center gap-2">
            <SkeletonBlock width={64} height={22} radius={11} />
            <SkeletonBlock width={48} height={22} radius={11} />
          </View>
          <SkeletonBlock stretch height={22} radius={8} />
          <SkeletonBlock width={180} height={14} radius={6} />
          <View className="gap-2 mt-1">
            <SkeletonBlock stretch height={11} radius={5} />
            <SkeletonBlock stretch height={11} radius={5} style={{ maxWidth: '96%' }} />
            <SkeletonBlock width={200} height={11} radius={5} />
          </View>
          <View className="flex-row gap-2 mt-1">
            <SkeletonBlock width={70} height={28} radius={14} />
            <SkeletonBlock width={70} height={28} radius={14} />
            <SkeletonBlock width={70} height={28} radius={14} />
          </View>
        </CardShell>

        <CardShell>
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={44} height={44} radius={22} />
            <View className="flex-1 gap-2" style={{ minWidth: 0 }}>
              <SkeletonBlock width={120} height={13} radius={6} />
              <SkeletonBlock width={80} height={10} radius={5} />
            </View>
            <SkeletonBlock width={72} height={32} radius={16} />
          </View>
        </CardShell>

        <CardShell>
          <SkeletonBlock width={90} height={12} radius={6} />
          <SkeletonBlock stretch height={11} radius={5} />
          <SkeletonBlock stretch height={11} radius={5} />
          <SkeletonBlock width={160} height={11} radius={5} />
        </CardShell>

        <SkeletonBlock stretch height={48} radius={16} />
      </View>
    );
  }

  if (variant === 'profile') {
    /**
     * Miroir du hero réel (onglet Profil + fiche publique) :
     * avatar · identité · badge niveau → actions → stats → barre Élan
     * puis À propos + menu.
     * Pas de padding outer : le parent gère safe-area / header offset.
     */
    return (
      <View className="gap-3">
        <CardShell className="p-4">
          {/* Rangée hero — items-start pour coller le badge en haut sans pousser l’avatar */}
          <View className="flex-row items-start gap-3.5">
            <SkeletonBlock width={72} height={72} radius={36} />
            <IdentityLines />
            <SkeletonBlock
              width={52}
              height={28}
              radius={8}
              style={{ marginTop: 4, transform: [{ rotate: '12deg' }] }}
            />
          </View>

          {/* Actions : CTA large + 2 icônes */}
          <View className="flex-row items-center gap-2 mt-3.5">
            <SkeletonBlock rowFlex={1} height={40} radius={12} />
            <SkeletonBlock width={40} height={40} radius={12} />
            <SkeletonBlock width={40} height={40} radius={12} />
          </View>

          {/* Stats 4 colonnes */}
          <View
            className="flex-row mt-3.5 pt-3"
            style={{ borderTopWidth: 1, borderTopColor: colors.border }}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                className="flex-1 items-center gap-1.5"
                style={
                  i > 0
                    ? { borderLeftWidth: 1, borderLeftColor: colors.border }
                    : undefined
                }
              >
                <SkeletonBlock width={28} height={14} radius={6} />
                <SkeletonBlock width={40} height={8} radius={4} />
              </View>
            ))}
          </View>

          {/* Barre progression Élan */}
          <View className="mt-3 gap-1.5">
            <SkeletonBlock stretch height={6} radius={3} />
            <SkeletonBlock width={140} height={9} radius={4} />
          </View>
        </CardShell>

        {/* À propos + skills */}
        <CardShell className="p-4 gap-3">
          <View className="flex-row items-center justify-between">
            <SkeletonBlock width={72} height={12} radius={6} />
            <SkeletonBlock width={56} height={10} radius={5} />
          </View>
          <SkeletonBlock stretch height={12} radius={5} />
          <SkeletonBlock stretch height={12} radius={5} style={{ maxWidth: '88%' }} />
          <View className="flex-row gap-1.5 mt-0.5">
            <SkeletonBlock width={64} height={24} radius={12} />
            <SkeletonBlock width={56} height={24} radius={12} />
            <SkeletonBlock width={72} height={24} radius={12} />
          </View>
        </CardShell>

        {/* Menu / sections */}
        <CardShell className="p-2 gap-0">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className="flex-row items-center gap-3 px-2.5 py-3"
              style={
                i > 0
                  ? { borderTopWidth: 1, borderTopColor: colors.border }
                  : undefined
              }
            >
              <SkeletonBlock width={36} height={36} radius={10} />
              <View className="flex-1 gap-1.5" style={{ minWidth: 0 }}>
                <SkeletonBlock width={i === 0 ? 110 : 96} height={12} radius={6} />
                <SkeletonBlock width={i === 1 ? 150 : 130} height={10} radius={5} />
              </View>
              <SkeletonBlock width={14} height={14} radius={4} />
            </View>
          ))}
        </CardShell>
      </View>
    );
  }

  if (variant === 'form') {
    return (
      <View className="gap-4 p-4">
        <SkeletonBlock width={90} height={12} radius={6} />
        <SkeletonBlock stretch height={48} radius={14} />
        <SkeletonBlock width={90} height={12} radius={6} />
        <SkeletonBlock stretch height={48} radius={14} />
        <SkeletonBlock width={90} height={12} radius={6} />
        <SkeletonBlock stretch height={96} radius={14} />
        <SkeletonBlock stretch height={48} radius={14} />
      </View>
    );
  }

  if (variant === 'chat') {
    return (
      <View className="flex-1 px-4 py-6 gap-4">
        <View className="items-center gap-3 mb-4">
          <SkeletonBlock width={56} height={56} radius={28} />
          <SkeletonBlock width={120} height={12} radius={6} />
          <SkeletonBlock width={160} height={10} radius={5} />
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
        <SoftSurface key={i} className="p-4 gap-3">
          <View className="flex-row items-center gap-3">
            <SkeletonBlock width={40} height={40} radius={20} />
            <View className="flex-1 gap-2" style={{ minWidth: 0 }}>
              <SkeletonBlock width={110} height={12} radius={6} />
              <SkeletonBlock width={160} height={10} radius={5} />
            </View>
          </View>
          <SkeletonBlock stretch height={14} radius={6} style={{ maxWidth: '90%' }} />
          <SkeletonBlock stretch height={12} radius={5} />
          <SkeletonBlock width={100} height={10} radius={5} />
        </SoftSurface>
      ))}
    </View>
  );
}

/**
 * Plein écran data loading — header optionnel déjà monté par le parent.
 * Fond toujours `colors.bg` (suit le thème clair/sombre).
 *
 * - card/row + padded : inset 16
 * - profile + padded : inset horizontal 16 (le haut est offset par le parent tabs/stack)
 * - detail/form/chat : padding interne dans ListSkeleton
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

  const needsOuterPad = padded && (variant === 'card' || variant === 'row');
  const profilePad = variant === 'profile' && padded;

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: colors.bg,
        padding: needsOuterPad ? 16 : 0,
        ...(profilePad ? { paddingHorizontal: 16, paddingBottom: 24 } : null),
      }}
    >
      <ListSkeleton variant={variant} count={count} />
    </View>
  );
}
