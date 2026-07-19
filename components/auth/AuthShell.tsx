/**
 * Shell premium pour login / register (méthode + e-mail).
 * Pas de FormScreen générique — layout dédié hub.
 */
import { ArrowLeft } from 'lucide-react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import KeyboardSafe from '../ui/KeyboardSafe';

interface Props {
  onBack?: () => void;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  loading?: boolean;
}

export default function AuthShell({
  onBack,
  eyebrow = 'PIH Pulse',
  title,
  subtitle,
  children,
  footer,
  loading,
}: Props) {
  const { colors } = useThemeFlavor();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.bg, paddingTop: insets.top }}>
      {/* Halo décoratif premium */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -80,
          alignSelf: 'center',
          width: 280,
          height: 280,
          borderRadius: 140,
          backgroundColor: colors.turmeric,
          opacity: 0.07,
        }}
      />

      <View className="px-5 pt-2 pb-1 flex-row items-center">
        {onBack ? (
          <Pressable
            onPress={onBack}
            hitSlop={12}
            style={{
              backgroundColor: colors.card,
              borderColor: colors.border,
            }}
            className="w-11 h-11 rounded-full border items-center justify-center active:opacity-80"
          >
            <ArrowLeft size={18} color={colors.text} strokeWidth={2.2} />
          </Pressable>
        ) : (
          <View className="w-11" />
        )}
        <View className="flex-1" />
      </View>

      <KeyboardSafe className="flex-1" offset={12}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: footer ? 16 : 32 + insets.bottom,
            flexGrow: 1,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand mark */}
          <View className="items-center mb-8 mt-2">
            <View
              style={{
                backgroundColor: colors.card,
                borderColor: colors.turmeric + '55',
                shadowColor: colors.turmeric,
                shadowOpacity: 0.25,
                shadowRadius: 16,
                shadowOffset: { width: 0, height: 6 },
              }}
              className="w-16 h-16 rounded-3xl border-2 items-center justify-center mb-5"
            >
              <Text style={{ color: colors.turmeric }} className="font-space text-2xl font-bold">
                P
              </Text>
            </View>
            <Text
              style={{ color: colors.turmeric }}
              className="font-inter text-[11px] font-bold uppercase tracking-[3px] mb-2"
            >
              {eyebrow}
            </Text>
            <Text
              style={{ color: colors.text }}
              className="font-space text-[28px] font-bold text-center tracking-tight"
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={{ color: colors.textSecondary }}
                className="font-inter text-[14px] text-center leading-5 mt-2 px-4"
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {children}
        </ScrollView>

        {footer ? (
          <View
            style={{
              paddingHorizontal: 24,
              paddingTop: 8,
              paddingBottom: Math.max(insets.bottom, 16),
              borderTopWidth: 1,
              borderTopColor: colors.border + '88',
              backgroundColor: colors.bg,
            }}
          >
            {footer}
          </View>
        ) : null}
      </KeyboardSafe>
    </View>
  );
}
