/**
 * Easter egg World Cup — mini ballon sur l’icône Ship it.
 * Uniquement pendant ~700ms, puis callback onDone pour rétablir le 🚀.
 */
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

const SIZE = 20;

/** Ballon plus détaillé (panels + volume + reflet) */
function MiniBall({ size = SIZE }: { size?: number }) {
  const uid = useRef(`mb_${Math.random().toString(36).slice(2, 7)}`).current;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <RadialGradient id={`${uid}_skin`} cx="34%" cy="30%" r="68%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="42%" stopColor="#F5F5F5" />
          <Stop offset="78%" stopColor="#C8C8C8" />
          <Stop offset="100%" stopColor="#8E8E8E" />
        </RadialGradient>
        <RadialGradient id={`${uid}_dark`} cx="70%" cy="78%" r="50%">
          <Stop offset="0%" stopColor="#000" stopOpacity="0" />
          <Stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </RadialGradient>
        <RadialGradient id={`${uid}_spec`} cx="28%" cy="24%" r="22%">
          <Stop offset="0%" stopColor="#FFF" stopOpacity="0.9" />
          <Stop offset="100%" stopColor="#FFF" stopOpacity="0" />
        </RadialGradient>
      </Defs>

      {/* Ombre douce */}
      <Ellipse cx="32" cy="58" rx="14" ry="3.5" fill="#000" opacity={0.18} />

      {/* Sphère */}
      <Circle cx="32" cy="30" r="24" fill={`url(#${uid}_skin)`} />

      {/* Panneau central (pentagone) */}
      <Path
        d="M32 14 L41 20 L38 31 L26 31 L23 20 Z"
        fill="#121212"
      />
      {/* Hex / panels latéraux */}
      <Path
        d="M18 28 L24 22 L28 30 L24 38 L16 34 Z"
        fill="#1A1A1A"
      />
      <Path
        d="M46 28 L40 22 L36 30 L40 38 L48 34 Z"
        fill="#1A1A1A"
      />
      <Path
        d="M22 42 L28 38 L32 46 L26 52 L18 48 Z"
        fill="#141414"
      />
      <Path
        d="M42 42 L36 38 L32 46 L38 52 L46 48 Z"
        fill="#141414"
      />

      {/* Coutures */}
      <G stroke="#D0D0D0" strokeWidth="0.7" fill="none" opacity={0.55}>
        <Path d="M32 14 L41 20 L38 31 L26 31 L23 20 Z" />
        <Path d="M23 20 L18 28" />
        <Path d="M41 20 L46 28" />
        <Path d="M26 31 L24 38" />
        <Path d="M38 31 L40 38" />
        <Path d="M24 38 L32 46 L40 38" />
      </G>

      {/* Volume + highlight */}
      <Circle cx="32" cy="30" r="24" fill={`url(#${uid}_dark)`} />
      <Circle cx="32" cy="30" r="24" fill={`url(#${uid}_spec)`} />
      <Circle
        cx="32"
        cy="30"
        r="23.5"
        fill="none"
        stroke="#000"
        strokeOpacity={0.14}
        strokeWidth="1"
      />
    </Svg>
  );
}

interface Props {
  trigger: number;
  /** Appelé quand l’anim est finie → rétablir l’icône Ship */
  onDone?: () => void;
}

const DURATION_MS = 720;

export default function WorldCupBallIcon({ trigger, onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.4)).current;
  const rot = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (trigger <= 0) return;

    animRef.current?.stop();
    opacity.setValue(0);
    scale.setValue(0.3);
    rot.setValue(0);
    ty.setValue(0);

    animRef.current = Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.delay(DURATION_MS - 220),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]),
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 1.4,
          friction: 4,
          tension: 180,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1.05,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(rot, {
        toValue: 1,
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.timing(ty, {
          toValue: -8,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(ty, {
          toValue: 0,
          duration: 260,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animRef.current.start(({ finished }) => {
      if (finished) onDone?.();
    });

    return () => {
      animRef.current?.stop();
    };
  }, [trigger]);

  if (trigger <= 0) return null;

  const spin = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '400deg'],
  });

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY: ty }, { rotate: spin }, { scale }],
        }}
      >
        <MiniBall size={SIZE} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
});
