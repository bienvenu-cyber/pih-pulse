/**
 * Surfaces premium scalables — solid épuré (pas glass métier).
 * Utiliser partout pour listes / sections / empty : même langage.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

export type SoftVariant = 'card' | 'row' | 'inset' | 'plain';

type Props = {
  children: ReactNode;
  variant?: SoftVariant;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** Accent discret pour non-lu, etc. */
  accent?: boolean;
};

/**
 * card  — carte flottante hairline (feed-like)
 * row   — ligne liste soft (chat, notifs)
 * inset — champ / zone imbriquée (inputs group)
 * plain — fond deep sans bordure (chips, composer)
 */
export default function SoftSurface({
  children,
  variant = 'card',
  style,
  className,
  accent,
}: Props) {
  const { colors, isLight } = useThemeFlavor();
  const hairline = isLight ? 'rgba(13, 11, 5, 0.07)' : 'rgba(245, 237, 214, 0.1)';

  if (variant === 'plain') {
    return (
      <View
        className={className}
        style={[{ backgroundColor: colors.deep, borderRadius: 16 }, style]}
      >
        {children}
      </View>
    );
  }

  if (variant === 'inset') {
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: colors.deep,
            borderRadius: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: hairline,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  if (variant === 'row') {
    return (
      <View
        className={className}
        style={[
          {
            backgroundColor: colors.card,
            borderRadius: 20,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: accent ? colors.turmeric + '55' : hairline,
          },
          style,
        ]}
      >
        {children}
      </View>
    );
  }

  // card
  return (
    <View
      className={className}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 24,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: hairline,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
