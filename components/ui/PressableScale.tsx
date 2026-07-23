/**
 * Pressable premium : scale 0.97 + haptic optionnel.
 */
import { type ReactNode, useCallback } from 'react';
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { haptic, type HapticKind } from '../../lib/haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 0.97 par défaut */
  scaleTo?: number;
  hapticKind?: HapticKind | false;
  className?: string;
};

export default function PressableScale({
  children,
  style,
  scaleTo = 0.97,
  hapticKind = 'light',
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  className,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleTo, { damping: 18, stiffness: 420 });
      if (hapticKind !== false) void haptic(hapticKind);
      onPressIn?.(e);
    },
    [hapticKind, onPressIn, scale, scaleTo]
  );

  const handleOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, { damping: 16, stiffness: 380 });
      onPressOut?.(e);
    },
    [onPressOut, scale]
  );

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPress={onPress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      className={className}
      style={[animStyle, style, disabled ? { opacity: 0.5 } : undefined]}
    >
      {children}
    </AnimatedPressable>
  );
}
