/**
 * Glass system PIH Pulse — blur là où ça compte (nav, sheets).
 * Fallback semi-transparent si blur indisponible (web / old build).
 */
import { BlurView } from 'expo-blur';
import { type ReactNode } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

export type GlassIntensity = 'nav' | 'sheet' | 'hero';

type GlassProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
  intensity?: GlassIntensity;
  /** Force fallback sans blur (ex. perf Android bas) */
  solid?: boolean;
};

function useGlassTokens(intensity: GlassIntensity) {
  const { colors, isLight, flavor } = useThemeFlavor();

  // Intensité blur native
  const blurAmount =
    intensity === 'sheet' ? (Platform.OS === 'ios' ? 48 : 36) : Platform.OS === 'ios' ? 40 : 28;

  const tint: 'light' | 'dark' | 'default' = isLight ? 'light' : 'dark';

  // Overlay teinté (par-dessus blur) pour lisibilité + charte Malt
  let overlay: string;
  if (isLight) {
    overlay =
      intensity === 'sheet'
        ? 'rgba(248, 245, 236, 0.72)'
        : intensity === 'hero'
          ? 'rgba(255, 255, 255, 0.55)'
          : 'rgba(248, 245, 236, 0.55)';
  } else if (flavor === 'dark') {
    overlay =
      intensity === 'sheet'
        ? 'rgba(0, 0, 0, 0.72)'
        : intensity === 'hero'
          ? 'rgba(10, 10, 10, 0.55)'
          : 'rgba(0, 0, 0, 0.55)';
  } else {
    // malt
    overlay =
      intensity === 'sheet'
        ? 'rgba(13, 11, 5, 0.78)'
        : intensity === 'hero'
          ? 'rgba(24, 20, 11, 0.6)'
          : 'rgba(13, 11, 5, 0.62)';
  }

  // Fallback sans BlurView (web / solid)
  const solidBg = isLight
    ? intensity === 'sheet'
      ? 'rgba(248, 245, 236, 0.94)'
      : colors.headerBg
    : intensity === 'sheet'
      ? flavor === 'dark'
        ? 'rgba(10, 10, 10, 0.94)'
        : 'rgba(13, 11, 5, 0.92)'
      : colors.headerBg;

  const hairline = isLight ? 'rgba(13, 11, 5, 0.08)' : 'rgba(245, 237, 214, 0.1)';

  return { blurAmount, tint, overlay, solidBg, hairline, isLight };
}

/**
 * Surface glass générique (header, tab overlay, sheet body).
 */
export function GlassSurface({
  children,
  style,
  className,
  intensity = 'nav',
  solid = false,
}: GlassProps) {
  const { blurAmount, tint, overlay, solidBg } = useGlassTokens(intensity);
  const useBlur = !solid && Platform.OS !== 'web';

  if (!useBlur) {
    return (
      <View className={className} style={[{ backgroundColor: solidBg, overflow: 'hidden' }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View className={className} style={[{ overflow: 'hidden' }, style]}>
      <BlurView
        intensity={blurAmount}
        tint={tint}
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]}
      />
      {children}
    </View>
  );
}

/**
 * Sheet / modal bas de page glass (création, inviter…).
 */
export function GlassSheet({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  const { hairline } = useGlassTokens('sheet');
  return (
    <GlassSurface
      intensity="sheet"
      className={className}
      style={[
        {
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: hairline,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );
}

/**
 * Carte hero glass (profil, détail) — usage rare.
 */
export function GlassCard({
  children,
  style,
  className,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  className?: string;
}) {
  const { hairline, isLight } = useGlassTokens('hero');
  return (
    <GlassSurface
      intensity="hero"
      className={className}
      style={[
        {
          borderRadius: 20,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: hairline,
          overflow: 'hidden',
          // Soft depth
          ...Platform.select({
            ios: {
              shadowColor: isLight ? '#0D0B05' : '#000',
              shadowOpacity: isLight ? 0.08 : 0.35,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            },
            android: { elevation: 3 },
            default: {},
          }),
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );
}

/**
 * Backdrop scrim pour modals (au-dessus du contenu, sous le sheet).
 */
export function GlassScrim({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' }, style]}>{children}</View>
  );
}
