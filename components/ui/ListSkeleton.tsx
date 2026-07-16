import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';

interface ListSkeletonProps {
  count?: number;
  /** 'card' = feed/projet, 'row' = talent/chat */
  variant?: 'card' | 'row';
}

function SkeletonBlock({
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

/** Skeleton loading premium pour listes */
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
