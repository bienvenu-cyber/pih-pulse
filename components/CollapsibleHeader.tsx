import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, Plus, Send } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { useUnreadBadges } from '../hooks/useUnreadBadges';

interface CollapsibleHeaderProps {
  title: string;
  visible: boolean;
  /**
   * Mode type Instagram : remplace le titre par un bouton « + »
   * qui ouvre le menu de création (callback parent).
   */
  onCreatePress?: () => void;
}

function BadgeDot({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? '9+' : String(count);
  return (
    <View className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-turmeric items-center justify-center border border-malt-deep">
      <Text className="text-malt-deep font-inter-bold text-[8px] font-bold leading-[10px]">
        {label}
      </Text>
    </View>
  );
}

export default function CollapsibleHeader({
  title,
  visible,
  onCreatePress,
}: CollapsibleHeaderProps) {
  const router = useRouter();
  const { colors } = useThemeFlavor();
  const insets = useSafeAreaInsets();
  const { notifCount, chatCount, refreshBadges } = useUnreadBadges();

  useFocusEffect(
    useCallback(() => {
      refreshBadges();
    }, [refreshBadges])
  );

  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        paddingTop: insets.top,
        backgroundColor: colors.headerBg,
        borderBottomColor: colors.border,
        borderBottomWidth: 1,
      }}
    >
      <View className="h-14 flex-row items-center justify-between px-5">
        {onCreatePress ? (
          <Pressable
            onPress={onCreatePress}
            accessibilityRole="button"
            accessibilityLabel="Créer un contenu"
            hitSlop={8}
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-9 h-9 rounded-full border items-center justify-center active:opacity-85"
          >
            <Plus size={20} color={colors.text} strokeWidth={2.4} />
          </Pressable>
        ) : (
          <Text
            style={{ color: colors.text }}
            className="font-space text-lg font-bold"
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}

        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={() => router.push('/notifications')}
            accessibilityRole="button"
            accessibilityLabel={
              notifCount > 0
                ? `Notifications, ${notifCount} non lues`
                : 'Notifications'
            }
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-9 h-9 rounded-full border items-center justify-center active:opacity-85 relative"
          >
            <Bell size={16} color={colors.textSecondary} />
            <BadgeDot count={notifCount} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/chat')}
            accessibilityRole="button"
            accessibilityLabel={
              chatCount > 0 ? `Messagerie, ${chatCount} non lus` : 'Messagerie'
            }
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
            className="w-9 h-9 rounded-full border items-center justify-center active:opacity-85 relative"
          >
            <Send
              size={14}
              color={colors.textSecondary}
              style={{
                transform: [{ rotate: '30deg' }, { translateX: -0.5 }, { translateY: -0.5 }],
              }}
            />
            <BadgeDot count={chatCount} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Hauteur header collapsible pour paddingTop des listes (safe area + barre 56) */
export function useCollapsibleHeaderOffset() {
  const insets = useSafeAreaInsets();
  return insets.top + 56;
}

/** Padding bas listes tabs (tab bar + safe area) */
export function useTabListBottomPadding() {
  const insets = useSafeAreaInsets();
  return 72 + Math.max(insets.bottom, 8);
}
