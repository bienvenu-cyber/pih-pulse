import { useFocusEffect, useRouter } from 'expo-router';
import { Bell, MessageCircle, Plus } from 'lucide-react-native';
import { useCallback, type ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import { useUnreadBadges } from '../hooks/useUnreadBadges';
import { GlassSurface } from './ui/Glass';
import PressableScale from './ui/PressableScale';

interface CollapsibleHeaderProps {
  title: string;
  visible: boolean;
  /**
   * Mode type Instagram : remplace le titre par un bouton « + »
   * qui ouvre le menu de création (callback parent).
   */
  onCreatePress?: () => void;
}

/** Badge non-lu style Insta — pastille libre, sans cadre autour de l’icône. */
function BadgeDot({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 9 ? '9+' : String(count);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -3,
        right: -5,
        minWidth: 16,
        height: 16,
        paddingHorizontal: 4,
        borderRadius: 8,
        backgroundColor: '#FFBE0B',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: '#0D0B05',
          fontSize: 9,
          fontWeight: '700',
          lineHeight: 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/** Hit target large, zero chrome + micro scale. */
function HeaderIconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      hapticKind="selection"
      scaleTo={0.92}
      className="w-10 h-10 items-center justify-center"
    >
      {children}
    </PressableScale>
  );
}

export default function CollapsibleHeader({
  title,
  visible,
  onCreatePress,
}: CollapsibleHeaderProps) {
  const router = useRouter();
  const { colors, isLight } = useThemeFlavor();
  const insets = useSafeAreaInsets();
  const { notifCount, chatCount, refreshBadges } = useUnreadBadges();

  useFocusEffect(
    useCallback(() => {
      refreshBadges();
    }, [refreshBadges])
  );

  if (!visible) return null;

  const hairline = isLight ? 'rgba(13, 11, 5, 0.08)' : 'rgba(245, 237, 214, 0.12)';

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
      }}
    >
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
          style={{ height: 48, paddingHorizontal: 14 }}
        >
          {onCreatePress ? (
            <HeaderIconButton onPress={onCreatePress} label="Créer un contenu">
              <Plus size={26} color={colors.text} strokeWidth={2} />
            </HeaderIconButton>
          ) : (
            <Text
              style={{
                color: colors.text,
                fontSize: 22,
                fontWeight: '700',
                letterSpacing: -0.4,
                fontFamily: 'SpaceGrotesk700',
              }}
              accessibilityRole="header"
              numberOfLines={1}
            >
              {title}
            </Text>
          )}

          <View className="flex-row items-center" style={{ gap: 2 }}>
            <HeaderIconButton
              onPress={() => router.push('/notifications')}
              label={
                notifCount > 0
                  ? `Notifications, ${notifCount} non lues`
                  : 'Notifications'
              }
            >
              <View className="relative">
                <Bell size={24} color={colors.text} strokeWidth={1.85} />
                <BadgeDot count={notifCount} />
              </View>
            </HeaderIconButton>

            <HeaderIconButton
              onPress={() => router.push('/chat')}
              label={
                chatCount > 0 ? `Messagerie, ${chatCount} non lus` : 'Messagerie'
              }
            >
              <View className="relative">
                <MessageCircle size={24} color={colors.text} strokeWidth={1.85} />
                <BadgeDot count={chatCount} />
              </View>
            </HeaderIconButton>
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}

/** Hauteur header collapsible pour paddingTop des listes (safe area + barre 48) */
export function useCollapsibleHeaderOffset() {
  const insets = useSafeAreaInsets();
  return insets.top + 48;
}

/** Padding bas listes tabs (tab bar icônes seules + safe area) */
export function useTabListBottomPadding() {
  const insets = useSafeAreaInsets();
  return 64 + Math.max(insets.bottom, 8);
}
