import { useFocusEffect, useRouter } from 'expo-router';
import { Check, CheckCheck, MessageCircle, Search } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ProfileAvatar } from '../../components/ProfileAvatar';
import ThemedStackHeader from '../../components/ThemedStackHeader';
import EmptyState from '../../components/ui/EmptyState';
import ListSkeleton from '../../components/ui/ListSkeleton';
import SoftSurface from '../../components/ui/SoftSurface';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { countProjectChatUnreadBatch } from '../../lib/chatRead';
import { formatRelativeTime, formatRoleLabel, getInitials } from '../../lib/formatTime';
import { supabase } from '../../lib/supabase';

function pickProfile(raw: any) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function ChatInboxScreen() {
  const { colors } = useThemeFlavor();
  const { ready, userId: authUid } = useRequireAuth();
  const [conversations, setConversations] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [meId, setMeId] = useState<string | null>(null);
  const router = useRouter();

  const fetchConversations = useCallback(async (mode: 'init' | 'refresh' = 'init') => {
    if (mode === 'refresh') setRefreshing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setMeId(user.id);

      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);

      const projectIds = (memberProjects || []).map((p) => p.project_id);

      let msgQuery = supabase.from('messages').select(`
          id, text, created_at, sender_id, receiver_id, project_id, is_read,
          sender:profiles!sender_id(id, full_name, role, avatar_url),
          receiver:profiles!receiver_id(id, full_name, role, avatar_url),
          project:projects!project_id(id, name)
        `);

      if (projectIds.length > 0) {
        msgQuery = msgQuery.or(
          `sender_id.eq.${user.id},receiver_id.eq.${user.id},project_id.in.(${projectIds.join(',')})`
        );
      } else {
        msgQuery = msgQuery.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }

      const { data: msgs, error: msgsError } = await msgQuery
        .order('created_at', { ascending: false })
        .limit(200);

      if (msgsError) {
        console.error('Error fetching inbox messages:', msgsError);
        setConversations([]);
      } else {
        const convMap = new Map<string, any>();

        (msgs || []).forEach((m: any) => {
          const isProject = m.project_id !== null;

          if (isProject) {
            const projId = `project-${m.project_id}`;
            // Unread projet : rempli après via curseurs (pas is_read partagé)
            if (!convMap.has(projId)) {
              const project = pickProfile(m.project) || m.project;
              const name = project?.name || 'Projet';
              const sender = pickProfile(m.sender);
              const senderName = sender?.full_name || 'Membre';
              convMap.set(projId, {
                id: projId,
                projectUuid: m.project_id,
                name,
                role: "Projet d'équipe",
                initials: getInitials(name) || 'PR',
                avatarUrl: null,
                lastMessage: `${senderName}: ${m.text}`,
                time: formatRelativeTime(m.created_at),
                sortAt: new Date(m.created_at).getTime(),
                unreadCount: 0,
                isLastMessageUnread: false,
                lastMessageSenderId: m.sender_id,
                isLastMessageRead: true,
                isGroup: true,
              });
            }
          } else {
            const otherUser =
              m.sender_id === user.id
                ? pickProfile(m.receiver)
                : pickProfile(m.sender);
            if (!otherUser) return;

            const otherId = otherUser.id;
            const isUnread = m.receiver_id === user.id && !m.is_read;

            if (!convMap.has(otherId)) {
              const name = otherUser.full_name || 'Talent';
              convMap.set(otherId, {
                id: otherId,
                name,
                role: formatRoleLabel(otherUser.role),
                initials: getInitials(name),
                avatarUrl: otherUser.avatar_url || null,
                lastMessage: m.text,
                time: formatRelativeTime(m.created_at),
                sortAt: new Date(m.created_at).getTime(),
                unreadCount: isUnread ? 1 : 0,
                isLastMessageUnread: isUnread,
                lastMessageSenderId: m.sender_id,
                isLastMessageRead: m.is_read,
                isGroup: false,
              });
            } else if (isUnread) {
              const existing = convMap.get(otherId);
              existing.unreadCount += 1;
              existing.isLastMessageUnread = true;
            }
          }
        });

        // Non-lus projets via read model S1 (batch RPC)
        const projectUuids = Array.from(convMap.values())
          .filter((c) => c.isGroup && c.projectUuid)
          .map((c) => c.projectUuid as string);
        if (projectUuids.length) {
          const unreadMap = await countProjectChatUnreadBatch(projectUuids);
          unreadMap.forEach((n, pid) => {
            const key = `project-${pid}`;
            const conv = convMap.get(key);
            if (conv) {
              conv.unreadCount = n;
              conv.isLastMessageUnread = n > 0;
            }
          });
        }

        const convList = Array.from(convMap.values()).sort(
          (a, b) => (b.sortAt || 0) - (a.sortAt || 0)
        );
        setConversations(convList);
      }

      // Peers déjà en conversation DM → exclus des Suggestions
      const existingPeerIds = new Set<string>();
      const { data: dmRows } = await supabase
        .from('messages')
        .select('sender_id, receiver_id')
        .is('project_id', null)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .limit(500);

      (dmRows || []).forEach((m: { sender_id: string; receiver_id: string | null }) => {
        if (m.sender_id === user.id && m.receiver_id) existingPeerIds.add(m.receiver_id);
        if (m.receiver_id === user.id && m.sender_id) existingPeerIds.add(m.sender_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role, avatar_url')
        .neq('id', user.id)
        .order('reputation_points', { ascending: false })
        .limit(24);

      if (profiles) {
        setSuggestions(
          profiles
            .filter((p) => !existingPeerIds.has(p.id))
            .slice(0, 8)
            .map((p) => {
              const name = p.full_name || 'Talent';
              return {
                id: p.id,
                name,
                role: formatRoleLabel(p.role),
                initials: getInitials(name),
                avatarUrl: p.avatar_url || null,
              };
            })
        );
      } else {
        setSuggestions([]);
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
      if (!ready) return;
      fetchConversations('init');
    }, [fetchConversations, ready])
  );

  // Realtime inbox — toujours déclaré avant tout return (rules of hooks)
  useEffect(() => {
    if (!ready) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      channel = supabase
        .channel(`inbox-rt-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          () => fetchConversations('init')
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [fetchConversations, ready]);

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (c.lastMessage || '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  const filteredSuggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestions.slice(0, 6);
    return suggestions.filter(
      (s) => s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q)
    );
  }, [suggestions, search]);

  if (!ready) {
    return <View className="flex-1" style={{ backgroundColor: colors.bg }} />;
  }

  return (
    <View style={{ backgroundColor: colors.bg }} className="flex-1">
      <ThemedStackHeader
        title="Messagerie"
        onBack={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/(tabs)');
        }}
      />

      <View className="px-4 pt-3 pb-2">
        <SoftSurface variant="inset" className="flex-row items-center h-10 rounded-full px-3.5 gap-2">
          <Search size={16} color={colors.textSecondary} strokeWidth={1.85} />
          <TextInput
            placeholder="Rechercher…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{ color: colors.text }}
            className="flex-1 font-inter text-sm h-full"
          />
        </SoftSurface>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchConversations('refresh')}
            tintColor={colors.turmeric}
            colors={[colors.turmeric]}
          />
        }
      >
        {loading ? (
          <ListSkeleton count={5} variant="row" />
        ) : (
          <>
            {filteredConversations.length > 0 ? (
              <View className="gap-2">
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-inter text-[10px] font-bold uppercase tracking-wider ml-1"
                >
                  Discussions
                </Text>
                {filteredConversations.map((conv) => (
                  <Pressable
                    key={conv.id}
                    onPress={() => router.push(`/chat/${conv.id}`)}
                    className="active:opacity-95"
                  >
                  <SoftSurface
                    variant="row"
                    accent={!!conv.isLastMessageUnread}
                    className="flex-row items-center justify-between p-3.5"
                  >
                    <View className="flex-row items-center gap-3 flex-1 pr-3">
                      <ProfileAvatar
                        uri={conv.avatarUrl}
                        name={conv.name}
                        initials={conv.initials}
                        size={48}
                        bg={colors.deep}
                        borderColor={colors.border}
                        textColor={colors.text}
                      />
                      <View className="flex-1 gap-0.5">
                        <Text
                          style={{ color: colors.text }}
                          className="font-space text-sm font-bold"
                          numberOfLines={1}
                        >
                          {conv.name}
                        </Text>
                        <Text
                          style={{
                            color: conv.isLastMessageUnread
                              ? colors.text
                              : colors.textSecondary,
                          }}
                          className={`font-inter text-xs ${
                            conv.isLastMessageUnread ? 'font-bold' : ''
                          }`}
                          numberOfLines={1}
                        >
                          {conv.lastMessage}
                        </Text>
                      </View>
                    </View>
                    <View className="items-end gap-1.5">
                      <Text
                        style={{
                          color: conv.isLastMessageUnread
                            ? colors.turmeric
                            : colors.textSecondary,
                        }}
                        className="font-inter text-[10px]"
                      >
                        {conv.time}
                      </Text>
                      {conv.unreadCount > 0 ? (
                        <View className="bg-turmeric px-1.5 py-0.5 rounded-full min-w-[18px] items-center">
                          <Text className="text-malt-deep font-inter-bold text-[9px] font-bold">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </Text>
                        </View>
                      ) : conv.lastMessageSenderId === meId ? (
                        conv.isLastMessageRead ? (
                          <CheckCheck size={14} color={colors.turmeric} />
                        ) : (
                          <Check size={14} color={colors.textSecondary} />
                        )
                      ) : null}
                    </View>
                  </SoftSurface>
                  </Pressable>
                ))}
              </View>
            ) : search ? (
              <EmptyState
                icon={Search}
                title="Aucun résultat"
                description="Aucune discussion ne correspond à ta recherche."
              />
            ) : (
              <EmptyState
                icon={MessageCircle}
                title="Pas encore de messages"
                description="Contacte un talent depuis Talents ou un profil pour démarrer une conversation."
                actionLabel="Voir la communauté"
                onAction={() => router.push('/(tabs)/teams')}
              />
            )}

            {filteredSuggestions.length > 0 && (
              <View className="gap-2 mt-1">
                <Text
                  style={{ color: colors.textSecondary }}
                  className="font-inter text-[10px] font-bold uppercase tracking-wider ml-1"
                >
                  {conversations.length === 0 ? 'Démarrer une discussion' : 'Suggestions'}
                </Text>
                {filteredSuggestions.map((sugg) => (
                  <Pressable
                    key={sugg.id}
                    onPress={() => router.push(`/chat/${sugg.id}`)}
                    className="active:opacity-95"
                  >
                  <SoftSurface variant="row" className="flex-row items-center justify-between p-3.5">
                    <View className="flex-row items-center gap-3">
                      <ProfileAvatar
                        uri={sugg.avatarUrl}
                        name={sugg.name}
                        initials={sugg.initials}
                        size={40}
                        bg={colors.deep}
                        borderColor={colors.border}
                        textColor={colors.text}
                      />
                      <View>
                        <Text
                          style={{ color: colors.text }}
                          className="font-space text-sm font-bold"
                        >
                          {sugg.name}
                        </Text>
                        <Text
                          style={{ color: colors.textSecondary }}
                          className="font-inter text-[10px]"
                        >
                          {sugg.role}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{ backgroundColor: colors.deep }}
                      className="px-3 py-1.5 rounded-full"
                    >
                      <Text
                        style={{ color: colors.text }}
                        className="font-inter text-[10px] font-semibold"
                      >
                        Message
                      </Text>
                    </View>
                  </SoftSurface>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
