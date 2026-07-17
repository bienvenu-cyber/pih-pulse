import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft, Check, CheckCheck, MessageCircle, Search, Send } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../components/ui/EmptyState';
import ListSkeleton from '../../components/ui/ListSkeleton';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { countProjectChatUnreadBatch } from '../../lib/chatRead';
import { formatRelativeTime } from '../../lib/formatTime';
import { supabase } from '../../lib/supabase';

function pickProfile(raw: any) {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] : raw;
}

export default function ChatInboxScreen() {
  const { colors } = useThemeFlavor();
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
                initials:
                  name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'PR',
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
                role:
                  otherUser.role === 'product_creator'
                    ? 'Product Owner'
                    : otherUser.role
                      ? String(otherUser.role).charAt(0).toUpperCase() +
                        String(otherUser.role).slice(1)
                      : 'Membre',
                initials:
                  name
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase() || 'T',
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

        // Suggestions
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .neq('id', user.id)
          .order('reputation_points', { ascending: false })
          .limit(12);

        if (profiles) {
          setSuggestions(
            profiles
              .filter((p) => !convMap.has(p.id))
              .map((p) => {
                const name = p.full_name || 'Talent';
                return {
                  id: p.id,
                  name,
                  role:
                    p.role === 'product_creator'
                      ? 'Product Owner'
                      : p.role
                        ? String(p.role).charAt(0).toUpperCase() + String(p.role).slice(1)
                        : 'Membre',
                  initials:
                    name
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() || 'T',
                  avatarUrl: p.avatar_url || null,
                };
              })
          );
        }
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
      fetchConversations('init');
    }, [fetchConversations])
  );

  useEffect(() => {
    let channel: any = null;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
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
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchConversations]);

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

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      <View
        style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
        className="h-14 flex-row items-center justify-between px-6 border-b"
      >
        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="w-9 h-9 rounded-full border items-center justify-center"
        >
          <ArrowLeft size={18} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.text }} className="font-space text-base font-bold">
          Messagerie
        </Text>
        <View className="w-9 h-9" />
      </View>

      <View
        style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }}
        className="px-4 pt-3 pb-3 border-b"
      >
        <View
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
          className="flex-row items-center h-11 rounded-xl border px-3 gap-2"
        >
          <Search size={16} color={colors.textSecondary} />
          <TextInput
            placeholder="Rechercher une discussion ou un talent…"
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{ color: colors.text }}
            className="flex-1 font-inter text-sm h-full"
          />
        </View>
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
              <View className="gap-2.5">
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
                    style={{
                      backgroundColor: colors.card,
                      borderColor: conv.isLastMessageUnread
                        ? colors.turmeric + '55'
                        : colors.border,
                    }}
                    className="flex-row items-center justify-between border p-3.5 rounded-2xl active:opacity-95"
                  >
                    <View className="flex-row items-center gap-3 flex-1 pr-3">
                      <View
                        style={{
                          backgroundColor: colors.deep,
                          borderColor: colors.border,
                        }}
                        className="w-12 h-12 rounded-full border items-center justify-center overflow-hidden"
                      >
                        {conv.avatarUrl ? (
                          <Image
                            source={{ uri: conv.avatarUrl }}
                            style={{ width: 48, height: 48 }}
                          />
                        ) : (
                          <Text
                            style={{ color: colors.text }}
                            className="font-space text-sm font-bold"
                          >
                            {conv.initials}
                          </Text>
                        )}
                      </View>
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
                description="Contacte un talent depuis Équipes ou un profil pour démarrer une conversation."
                actionLabel="Voir la communauté"
                onAction={() => router.push('/(tabs)/teams')}
              />
            )}

            {filteredSuggestions.length > 0 && (
              <View className="gap-2.5 mt-1">
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
                    style={{
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                    className="flex-row items-center justify-between border p-3.5 rounded-2xl active:opacity-95"
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        style={{
                          backgroundColor: colors.deep,
                          borderColor: colors.border,
                        }}
                        className="w-10 h-10 rounded-full border overflow-hidden items-center justify-center"
                      >
                        {sugg.avatarUrl ? (
                          <Image
                            source={{ uri: sugg.avatarUrl }}
                            style={{ width: 40, height: 40 }}
                          />
                        ) : (
                          <Text
                            style={{ color: colors.text }}
                            className="font-space text-xs font-bold"
                          >
                            {sugg.initials}
                          </Text>
                        )}
                      </View>
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
                      style={{
                        backgroundColor: colors.deep,
                        borderColor: colors.border,
                      }}
                      className="border px-3 py-1.5 rounded-full flex-row items-center gap-1"
                    >
                      <Text
                        style={{ color: colors.text }}
                        className="font-inter text-[10px] font-bold"
                      >
                        Message
                      </Text>
                      <Send
                        size={8}
                        color={colors.text}
                        style={{ transform: [{ rotate: '30deg' }] }}
                      />
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
