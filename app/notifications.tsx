/**
 * Inbox notifications — skeleton + pagination + cache session (pas de spinner plein écran).
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
import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProfileAvatar } from '../components/ProfileAvatar';
import EmptyState from '../components/ui/EmptyState';
import ListSkeleton from '../components/ui/ListSkeleton';
import LoadMoreFooter from '../components/ui/LoadMoreFooter';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useThemeFlavor } from '../hooks/useThemeFlavor';
import {
  fetchNotifications,
  getCachedNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeUserNotifications,
  type ActivityNotification,
} from '../lib/activity';
import { formatRelativeTime } from '../lib/formatTime';

const PAGE_SIZE = 25;

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

const WELCOME_ID = 'sys-welcome';

function makeWelcome(userId: string): ActivityNotification {
  return {
    id: WELCOME_ID,
    user_id: userId,
    actor_id: null,
    type: 'system',
    title: 'Bienvenue sur Pulse !',
    body: 'Réactions, messages, candidatures et validations apparaîtront ici.',
    route: '/(tabs)',
    ref_id: null,
    ref_type: null,
    is_read: true,
    created_at: new Date().toISOString(),
  };
}

function safeRoute(route: string | null | undefined): string | null {
  if (!route || typeof route !== 'string') return null;
  const r = route.trim();
  if (!r.startsWith('/') || r.includes('://')) return null;
  return r;
}

export default function NotificationsScreen() {
  const { colors } = useThemeFlavor();
  const { ready, userId: authUid } = useRequireAuth();
  const router = useRouter();
  const mountedRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const notificationsRef = useRef<ActivityNotification[]>([]);

  const [notifications, setNotifications] = useState<ActivityNotification[]>([]);
  /** Premier chargement sans données en cache */
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const setList = useCallback((next: ActivityNotification[] | ((prev: ActivityNotification[]) => ActivityNotification[])) => {
    setNotifications((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      notificationsRef.current = resolved;
      return resolved;
    });
  }, []);

  const setHasMoreSafe = (v: boolean) => {
    hasMoreRef.current = v;
    setHasMore(v);
  };

  const loadPage = useCallback(
    async (opts: { uid: string; mode: 'init' | 'refresh' | 'more' | 'soft' }) => {
      const { uid, mode } = opts;
      if (mode === 'more') {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

      try {
        let beforeParam: string | undefined;
        if (mode === 'more') {
          const last = notificationsRef.current[notificationsRef.current.length - 1];
          if (last && !String(last.id).startsWith('sys-') && last.created_at) {
            beforeParam = last.created_at;
          } else {
            setHasMoreSafe(false);
            return;
          }
        }

        const { rows, hasMore: more } = await fetchNotifications(uid, {
          limit: PAGE_SIZE,
          before: beforeParam,
        });

        if (!mountedRef.current) return;

        if (mode === 'more') {
          if (rows.length) {
            setList((prev) => {
              const seen = new Set(prev.map((n) => n.id));
              return [...prev, ...rows.filter((r) => !seen.has(r.id))];
            });
          }
          setHasMoreSafe(more && rows.length > 0);
        } else if (rows.length === 0) {
          setList([makeWelcome(uid)]);
          setHasMoreSafe(false);
        } else {
          setList(rows);
          setHasMoreSafe(more);
        }
      } catch (err) {
        console.error('[notifications] load:', err);
        if (mountedRef.current && mode !== 'more') {
          setList((prev) => (prev.length ? prev : [makeWelcome(uid)]));
        }
      } finally {
        if (!mountedRef.current) return;
        setShowSkeleton(false);
        setRefreshing(false);
        if (mode === 'more') {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      }
    },
    [setList]
  );

  useFocusEffect(
    useCallback(() => {
      mountedRef.current = true;
      if (!ready || !authUid) return;

      setUserId(authUid);

      const cached = getCachedNotifications(authUid);
      if (cached?.length) {
        notificationsRef.current = cached;
        setNotifications(cached);
        setShowSkeleton(false);
        void loadPage({ uid: authUid, mode: 'soft' });
      } else if (notificationsRef.current.length === 0) {
        setShowSkeleton(true);
        void loadPage({ uid: authUid, mode: 'init' });
      } else {
        setShowSkeleton(false);
        void loadPage({ uid: authUid, mode: 'soft' });
      }

      let unsub: (() => void) | undefined;
      try {
        unsub = subscribeUserNotifications(authUid, () => {
          void loadPage({ uid: authUid, mode: 'soft' });
        });
      } catch (e) {
        console.warn('[notifications] subscribe:', e);
      }

      return () => {
        mountedRef.current = false;
        try {
          unsub?.();
        } catch {
          /* ignore */
        }
      };
    }, [ready, authUid, loadPage])
  );

  const handlePress = async (notif: ActivityNotification) => {
    try {
      if (notif.id && !String(notif.id).startsWith('sys-') && !notif.is_read) {
        await markNotificationRead(notif.id);
        setList((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      }
      const route = safeRoute(notif.route);
      if (route) router.push(route as any);
    } catch (e) {
      console.warn('[notifications] press:', e);
    }
  };

  const handleMarkAll = async () => {
    if (!userId) return;
    try {
      await markAllNotificationsRead(userId);
      setList((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {
      console.warn('[notifications] mark all:', e);
    }
  };

  const onEndReached = () => {
    if (!userId || showSkeleton || !hasMoreRef.current) return;
    void loadPage({ uid: userId, mode: 'more' });
  };

  // Auth gate minimal — pas de spinner notifs
  if (!ready) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1" />
    );
  }

  const unread = notifications.filter(
    (n) => !n.is_read && !String(n.id).startsWith('sys-')
  ).length;

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1" edges={['top']}>
      <View
        style={{
          borderBottomColor: colors.border + '99',
          borderBottomWidth: 0.5,
          height: 48,
          paddingHorizontal: 8,
        }}
        className="flex-row items-center justify-between"
      >
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={10}
          className="w-11 h-11 items-center justify-center active:opacity-55"
        >
          <ArrowLeft size={24} color={colors.text} strokeWidth={1.85} />
        </Pressable>
        <Text style={{ color: colors.text }} className="font-space text-[17px] font-bold">
          Notifications{unread > 0 ? ` (${unread})` : ''}
        </Text>
        <Pressable
          onPress={() => void handleMarkAll()}
          hitSlop={10}
          className="min-w-[44px] h-11 items-end justify-center pr-1"
          accessibilityRole="button"
          accessibilityLabel="Tout marquer comme lu"
        >
          {unread > 0 ? (
            <Text style={{ color: colors.turmeric }} className="font-inter text-xs font-bold">
              Tout lu
            </Text>
          ) : (
            <View className="w-11" />
          )}
        </Pressable>
      </View>

      {showSkeleton ? (
        <View className="flex-1 px-4 pt-4" style={{ backgroundColor: colors.bg }}>
          <ListSkeleton count={6} variant="row" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) => item?.id || `notif-${index}`}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: 40,
            flexGrow: 1,
            gap: 10,
          }}
          showsVerticalScrollIndicator={false}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                if (!userId && !authUid) return;
                setRefreshing(true);
                void loadPage({ uid: (userId || authUid)!, mode: 'refresh' });
              }}
              tintColor={colors.turmeric}
              colors={[colors.turmeric]}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={Bell}
              title="Aucune notification"
              description="Les réactions, messages et candidatures apparaîtront ici."
            />
          }
          ListFooterComponent={
            <LoadMoreFooter
              loading={loadingMore}
              hasMore={
                hasMore &&
                notifications.length > 0 &&
                !String(notifications[0]?.id).startsWith('sys-')
              }
              compact
            />
          }
          renderItem={({ item: notif }) => {
            if (!notif) return null;
            const type = String(notif.type || 'system');
            const Icon = ICON_BY_TYPE[type] || Bell;
            const iconColor = COLOR_BY_TYPE[type] || colors.textSecondary;
            const unreadDot = !notif.is_read && !String(notif.id).startsWith('sys-');
            const actorName = notif.actor?.full_name;
            const avatar = notif.actor?.avatar_url;

            return (
              <Pressable
                onPress={() => void handlePress(notif)}
                accessibilityRole="button"
                accessibilityLabel={`${notif.title || 'Notification'}. ${notif.body || ''}`}
                style={{
                  backgroundColor: colors.card,
                  borderColor: unreadDot ? colors.turmeric + '55' : colors.border,
                }}
                className="flex-row items-start border p-4 rounded-2xl gap-3 active:opacity-95"
              >
                <View className="mt-0.5">
                  {avatar ? (
                    <ProfileAvatar
                      uri={avatar}
                      name={actorName}
                      size={40}
                      bg={colors.deep}
                      borderColor={colors.border}
                      textColor={colors.text}
                    />
                  ) : (
                    <View
                      style={{ backgroundColor: colors.deep, borderColor: colors.border }}
                      className="w-10 h-10 rounded-xl border items-center justify-center"
                    >
                      <Icon size={16} color={iconColor} />
                    </View>
                  )}
                </View>
                <View className="flex-1 gap-1">
                  <View className="flex-row justify-between items-start gap-2">
                    <Text
                      style={{ color: colors.text }}
                      className="font-space text-sm font-bold flex-1"
                      numberOfLines={2}
                    >
                      {notif.title || 'Notification'}
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
                  {!!notif.body && (
                    <Text
                      style={{ color: colors.textSecondary }}
                      className="font-inter text-xs leading-4"
                      numberOfLines={3}
                    >
                      {notif.body}
                    </Text>
                  )}
                  {unreadDot ? (
                    <View className="self-start mt-1 w-1.5 h-1.5 rounded-full bg-turmeric" />
                  ) : null}
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
