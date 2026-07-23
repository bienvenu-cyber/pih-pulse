import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { GlassSurface } from './ui/Glass';
import PressableScale from './ui/PressableScale';

interface Props {
  title: string;
  onBack: () => void;
  disabled?: boolean;
  /** Action droite optionnelle (ex. « Tout lu ») */
  right?: ReactNode;
  /** Sous-titre centré discret */
  subtitle?: string;
}

/** Header stack glass — scalable pour chat, notifs, détails. */
export default function ThemedStackHeader({
  title,
  onBack,
  disabled,
  right,
  subtitle,
}: Props) {
  const { colors, isLight } = useThemeFlavor();
  const insets = useSafeAreaInsets();
  const hairline = isLight ? 'rgba(13, 11, 5, 0.08)' : 'rgba(245, 237, 214, 0.12)';

  return (
    <GlassSurface
      intensity="nav"
      style={{
        paddingTop: insets.top,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: hairline,
      }}
    >
      <View
        className="flex-row items-center justify-between"
        style={{ height: subtitle ? 56 : 48, paddingHorizontal: 8 }}
      >
        <PressableScale
          onPress={onBack}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={10}
          hapticKind="selection"
          scaleTo={0.9}
          className="w-11 h-11 items-center justify-center"
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.85} />
        </PressableScale>
        <View className="flex-1 px-1 items-center">
          <Text
            style={{ color: colors.text }}
            className="font-space text-[17px] font-bold"
            accessibilityRole="header"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={{ color: colors.textSecondary }}
              className="font-inter text-[10px] mt-0.5"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="min-w-[44px] items-end justify-center pr-1">
          {right ?? <View className="w-11 h-11" />}
        </View>
      </View>
    </GlassSurface>
  );
}
