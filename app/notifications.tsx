/**
 * Inbox notifications — realtime + deep links + tous les types hub.
 */
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  AtSign,
  Bell,
  CheckCircle,
  Flame,
  Layers,
  Lightbulb,
  MessageCircle,
  Pin,
  Rocket,
  Sparkles,
  Star,
  Target,
  Users,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeUserNotifications,
  type ActivityNotification,
} from '../lib/activity';
import { formatRelativeTime } from '../lib/formatTime';
import { supabase } from '../lib/supabase';

const ICON_BY_TYPE: Record<string, any> = {
  mission_applied: Target,
  mission_approved: CheckCircle,
  mission_rejected: Target,
  mission_submitted: Layers,
  mission_validated: Sparkles,
  mission_changes: Target,
  project_joined: Users,
  project_status: Layers,
  project_invite: Users,
  message_received: MessageCircle,
  boost_received: Zap,
  reaction_received: Flame,
  reply_received: MessageCircle,
  reply_mention: AtSign,
  reply_useful: Star,
  reply_pinned: Pin,
  system: Bell,
  // sous-types reaction via body — fallbacks
  idea: Lightbulb,
  hot: Flame,
  ship: Rocket,
  contribute: Wrench,
};

const COLOR_BY_TYPE: Record<string, string> = {
  mission_applied: '#FFBE0B',
  mission_approved: '#7CB87A',
  mission_rejected: '#E8634A',
  mission_submitted: '#FFBE0B',
  mission_validated: '#7CB87A',
  mission_changes: '#E8634A',
  project_joined: '#7CB87A',
  project_status: '#FFBE0B',
  project_invite: '#FFBE0B',
  message_received: '#A39171',
  boost_received: '#7CB87A',
  reaction_received: '#E8634A',
  reply_received: '#A39171',
  reply_mention: '#FFBE0B',
  reply_useful: '#7CB87A',
  reply_pinned: '#FFBE0B',
  system: '#A39171',
};

export default function NotificationsScreen() {
  const { colors } = useThemeFlavor();
  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  const load = useCallback(async (uid?: string) => {
    try {
      let id = uid;
      if (!id) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        id = user.id;
        setUserId(user.id);
      }

      const list = await fetchNotifications(id, { limit: 60 });
      if (list.length === 0) {
        setNotifications([
          {
            id: 'sys-welcome',
            user_id: id,
            actor_id: null,
            type: 'system',
            title: 'Bienvenue sur Pulse !',
            body: 'Réactions, messages, candidatures et validations apparaîtront ici.',
            route: '/(tabs)',
            ref_id: null,
            ref_type: null,
            is_read: true,
            created_at: new Date().toISOString(),
          },
        ]);
      } else {
        setNotifications(list);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      let unsub: (() => void) | undefined;
      (async () => {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setUserId(user.id);
        await load(user.id);
        unsub = subscribeUserNotifications(user.id, () => {
          void load(user.id);
        });
      })();
      return () => unsub?.();
    }, [load, router])
  );

  const handlePress = async (notif: ActivityNotification) => {
    if (notif.id && !String(notif.id).startsWith('sys-') && !notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
    }
    if (notif.route) {
      router.push(notif.route as any);
    }
  };

  const handleMarkAll = async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  if (loading) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  const unread = notifications.filter((n) => !n.is_read && !String(n.id).startsWith('sys-')).length;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1" edges={['top']}>
      <View
        style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
        className="h-14 flex-row items-center justify-between px-5 border-b"
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="w-9 h-9 rounded-full border items-center justify-center"
        >
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text }} className="font-space text-base font-bold">
          Notifications{unread > 0 ? ` (${unread})` : ''}
        </Text>
        <Pressable
          onPress={handleMarkAll}
          hitSlop={8}
          className="min-w-[36px] items-end"
          accessibilityRole="button"
          accessibilityLabel="Tout marquer comme lu"
        >
          {unread > 0 ? (
            <Text style={{ color: colors.turmeric }} className="font-inter text-[10px] font-bold">
              Tout lu
            </Text>
          ) : (
            <View className="w-9" />
          )}
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load(userId || undefined);
            }}
            tintColor={colors.turmeric}
            colors={[colors.turmeric]}
          />
        }
        renderItem={({ item: notif }) => {
          const Icon = ICON_BY_TYPE[notif.type] || Bell;
          const iconColor = COLOR_BY_TYPE[notif.type] || colors.textSecondary;
          const unreadDot = !notif.is_read && !String(notif.id).startsWith('sys-');
          const actorName = notif.actor?.full_name;
          const avatar = notif.actor?.avatar_url;

          return (
            <Pressable
              onPress={() => handlePress(notif)}
              accessibilityRole="button"
              accessibilityLabel={`${notif.title}. ${notif.body}`}
              style={{
                backgroundColor: colors.card,
                borderColor: unreadDot ? colors.turmeric + '55' : colors.border,
              }}
              className="flex-row items-start border p-4 rounded-2xl gap-3 active:opacity-95"
            >
              <View
                style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                className="w-10 h-10 rounded-xl border items-center justify-center mt-0.5 overflow-hidden"
              >
                {avatar ? (
                  <Image source={{ uri: avatar }} style={{ width: 40, height: 40 }} />
                ) : (
                  <Icon size={16} color={iconColor} />
                )}
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row justify-between items-start gap-2">
                  <Text
                    style={{ color: colors.text }}
                    className="font-space text-sm font-bold flex-1"
                    numberOfLines={2}
                  >
                    {notif.title}
                  </Text>
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                    {formatRelativeTime(notif.created_at)}
                  </Text>
                </View>
                {actorName ? (
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                    {actorName}
                  </Text>
                ) : null}
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-inter text-xs leading-4"
                  numberOfLines={3}
                >
                  {notif.body}
                </Text>
                {unreadDot ? (
                  <View className="self-start mt-1 w-1.5 h-1.5 rounded-full bg-turmeric" />
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
