import { useLocalSearchParams, useRouter } from 'expo-router';
import { AlertTriangle, ArrowLeft, Check, CheckCheck, CheckCircle, Send } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { markProjectChatRead } from '../../lib/chatRead';
import {
  fetchDmMessagesPage,
  fetchProjectMessagesPage,
  toUiMessage,
} from '../../lib/messages';
import { supabase } from '../../lib/supabase';

export default function ChatRoomScreen() {
  const { colors } = useThemeFlavor();
  const { id } = useLocalSearchParams(); // ID of the user we are chatting with
  const router = useRouter();

  // Custom premium modal alerts
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'info'>('success');

  const showModal = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };
  
  const [themProfile, setThemProfile] = useState<any>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [myName, setMyName] = useState('Un collaborateur');
  const [projectTokens, setProjectTokens] = useState<string[]>([]);
  const [projectMemberIds, setProjectMemberIds] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [infoExpanded, setInfoExpanded] = useState(true);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const stickToBottomRef = useRef(true);
  const loadingOlderRef = useRef(false);
  const hasMoreOlderRef = useRef(false);
  const meIdRef = useRef<string | null>(null);

  const isProjectChat = typeof id === 'string' && id.startsWith('project-');
  const projectId = isProjectChat ? id.replace('project-', '') : null;

  const setHasMoreOlderSafe = (v: boolean) => {
    hasMoreOlderRef.current = v;
    setHasMoreOlder(v);
  };

  useEffect(() => {
    let activeChannel: any = null;

    const initChat = async () => {
      try {
        // 1. Get current logged-in user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.replace('/login');
          return;
        }
        setMeId(user.id);
        meIdRef.current = user.id;

        // Fetch current user full name
        const { data: myProf } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (myProf?.full_name) {
          setMyName(myProf.full_name);
        }

        if (isProjectChat && projectId) {
          // 2. Fetch project details
          const { data: proj, error: projError } = await supabase
            .from('projects')
            .select('id, name, description, status, creator:profiles!creator_id(full_name)')
            .eq('id', projectId)
            .single();

          if (projError || !proj) {
            console.error('Error loading project details:', projError);
            setThemProfile({
              name: 'Projet',
              role: "Groupe d'Équipe",
              initials: 'PR',
              description: 'Chargement des détails...',
              status: 'MVP',
              creator: 'Inconnu'
            });
          } else {
            const creator = Array.isArray(proj.creator) ? proj.creator[0] : proj.creator;
            const initials = proj.name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'PR';

            setThemProfile({
              id: proj.id,
              name: proj.name,
              role: "Projet d'Équipe",
              initials: initials,
              description: proj.description || 'Pas de description pour ce projet.',
              status: proj.status === 'mvp' ? 'MVP' : proj.status === 'prototype' ? 'Prototype' : 'Idée',
              creator: creator?.full_name || 'Inconnu'
            });
          }

          // 2b. Fetch project members to cache their names and tokens
          const names: Record<string, string> = {};
          const { data: members, error: memError } = await supabase
            .from('project_members')
            .select('user_id, profiles(full_name, expo_push_token)')
            .eq('project_id', projectId);

          if (!memError && members) {
            const tokens: string[] = [];
            const otherIds: string[] = [];
            members.forEach((m: any) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (m.user_id && m.user_id !== user.id) {
                otherIds.push(m.user_id);
              }
              if (profile) {
                names[m.user_id] = profile.full_name || 'Collaborateur';
                if (m.user_id !== user.id && profile.expo_push_token) {
                  tokens.push(profile.expo_push_token);
                }
              }
            });
            setMemberNames(names);
            setProjectTokens(tokens);
            setProjectMemberIds(otherIds);
          }

          // 3. Fetch project message history (paginé — derniers N)
          const page = await fetchProjectMessagesPage({ projectId });
          if (page.error) {
            console.error('Error fetching project messages:', page.error);
          } else {
            setMessages(
              page.rows.map((m) =>
                toUiMessage(m, user.id, {
                  senderName:
                    m.sender?.full_name || names[m.sender_id] || 'Collaborateur',
                })
              )
            );
            setHasMoreOlderSafe(page.hasMore);
          }

          // Read model S1 : curseur user×projet (pas is_read partagé)
          await markProjectChatRead(projectId);

          // 4. Set up project realtime listener
          const channel = supabase
            .channel(`project-chat-room-${projectId}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'messages',
                filter: `project_id=eq.${projectId}`
              },
              async (payload) => {
                if (payload.eventType === 'INSERT') {
                  const newMsg = payload.new;
                  
                  // Only process incoming messages
                  if (newMsg.sender_id !== user.id) {
                    // Curseur lecture projet (chat ouvert)
                    void markProjectChatRead(projectId);

                    // Resolve sender name (from cache or quick query)
                    let sName = memberNames[newMsg.sender_id];
                    if (!sName) {
                      const { data: prof } = await supabase
                        .from('profiles')
                        .select('full_name')
                        .eq('id', newMsg.sender_id)
                        .single();
                      sName = prof?.full_name || 'Collaborateur';
                      setMemberNames(prev => ({ ...prev, [newMsg.sender_id]: sName }));
                    }

                    stickToBottomRef.current = true;
                    setMessages((prev) => {
                      const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.text === newMsg.text));
                      if (filtered.some((m) => m.id === newMsg.id)) return filtered;
                      return [
                        ...filtered,
                        {
                          id: newMsg.id,
                          text: newMsg.text,
                          is_read: newMsg.is_read,
                          sender: 'them',
                          senderName: sName,
                          time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          created_at: newMsg.created_at,
                        }
                      ];
                    });
                  }
                }
              }
            )
            .subscribe();

          activeChannel = channel;

        } else {
          // Direct 1-to-1 Chat
          // 2. Fetch other user profile info
          const { data: profile, error: profError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

          if (profError || !profile) {
            console.error('Error loading receiver profile:', profError);
            setThemProfile({
              name: 'Talent Pulse',
              role: 'Collaborateur',
              initials: 'TP'
            });
          } else {
            const name = profile.full_name || 'Talent';
            const initials = name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'T';

            setThemProfile({
              id: profile.id,
              name: name,
              role: profile.role === 'product_creator' ? 'Product Owner' : 'Développeur',
              initials: initials,
              expo_push_token: profile.expo_push_token
            });
          }

          // 3. Fetch message thread history (paginé — derniers N)
          const page = await fetchDmMessagesPage({
            meId: user.id,
            otherId: String(id),
          });
          if (page.error) {
            console.error('Error fetching messages:', page.error);
          } else {
            setMessages(page.rows.map((m) => toUiMessage(m, user.id)));
            setHasMoreOlderSafe(page.hasMore);
          }

          // Mark unread from them → me (DM — ok full update, indexé)
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', id)
            .eq('receiver_id', user.id)
            .eq('is_read', false)
            .is('project_id', null);

          // 4. Set up realtime listener
          const channel = supabase
            .channel(`chat-room-${user.id}-${id}`)
            .on(
              'postgres_changes',
              {
                event: '*', // Listen to INSERT (new messages) and UPDATE (read status changes)
                schema: 'public',
                table: 'messages'
              },
              (payload) => {
                if (payload.eventType === 'INSERT') {
                  const newMsg = payload.new;
                  
                  // Only process incoming messages (sent by the other user)
                  if (newMsg.sender_id === id && newMsg.receiver_id === user.id) {
                    // Mark incoming message as read immediately in the DB since the chat is open
                    supabase
                      .from('messages')
                      .update({ is_read: true })
                      .eq('id', newMsg.id)
                      .then(({ error }) => {
                        if (error) console.error('Failed to mark incoming message as read:', error);
                      });

                    stickToBottomRef.current = true;
                    setMessages((prev) => {
                      // Filter out temporary optimistic messages with matching text to avoid any layout shifts
                      const filtered = prev.filter(m => !(m.id.startsWith('temp-') && m.text === newMsg.text));
                      if (filtered.some((m) => m.id === newMsg.id)) return filtered;
                      return [
                        ...filtered,
                        {
                          id: newMsg.id,
                          text: newMsg.text,
                          is_read: newMsg.is_read,
                          sender: 'them',
                          time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                          created_at: newMsg.created_at,
                        }
                      ];
                    });
                  }
                } else if (payload.eventType === 'UPDATE') {
                  const updatedMsg = payload.new;
                  // If a message in our thread had its read status changed, update it locally in real-time
                  if (
                    (updatedMsg.sender_id === user.id && updatedMsg.receiver_id === id) ||
                    (updatedMsg.sender_id === id && updatedMsg.receiver_id === user.id)
                  ) {
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === updatedMsg.id ? { ...m, is_read: updatedMsg.is_read } : m
                      )
                    );
                  }
                }
              }
            )
            .subscribe();

          activeChannel = channel;
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 150);
      }
    };

    initChat();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, [id]);

  const handleBack = () => {
    router.back();
  };

  /** Charge les messages plus anciens (scroll haut) — S0.4 */
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlderRef.current || !hasMoreOlderRef.current) return;
    const uid = meIdRef.current;
    if (!uid || messages.length === 0) return;

    const oldest = messages[0]?.created_at;
    if (!oldest) return;

    loadingOlderRef.current = true;
    setLoadingOlder(true);
    stickToBottomRef.current = false;

    try {
      if (isProjectChat && projectId) {
        const page = await fetchProjectMessagesPage({
          projectId,
          before: oldest,
        });
        if (page.rows.length) {
          const ui = page.rows.map((m) =>
            toUiMessage(m, uid, {
              senderName: m.sender?.full_name || memberNames[m.sender_id] || 'Collaborateur',
            })
          );
          setMessages((prev) => {
            const seen = new Set(prev.map((x) => x.id));
            return [...ui.filter((m) => !seen.has(m.id)), ...prev];
          });
        }
        setHasMoreOlderSafe(page.hasMore);
      } else if (id && typeof id === 'string') {
        const page = await fetchDmMessagesPage({
          meId: uid,
          otherId: id,
          before: oldest,
        });
        if (page.rows.length) {
          const ui = page.rows.map((m) => toUiMessage(m, uid));
          setMessages((prev) => {
            const seen = new Set(prev.map((x) => x.id));
            return [...ui.filter((m) => !seen.has(m.id)), ...prev];
          });
        }
        setHasMoreOlderSafe(page.hasMore);
      }
    } catch (e) {
      console.error('[chat] load older', e);
    } finally {
      setLoadingOlder(false);
      loadingOlderRef.current = false;
    }
  }, [messages, isProjectChat, projectId, id, memberNames]);

  const handleChatScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const y = contentOffset.y;
    stickToBottomRef.current =
      y + layoutMeasurement.height >= contentSize.height - 100;
    if (y < 72 && hasMoreOlderRef.current && !loadingOlderRef.current) {
      void loadOlderMessages();
    }
  };

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || !meId) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const nowIso = new Date().toISOString();
    const localMsg = {
      id: tempId,
      text: textToSend,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      created_at: nowIso,
    };

    stickToBottomRef.current = true;
    setMessages((prev) => [...prev, localMsg]);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Save message in Supabase
      const insertObj: any = {
        sender_id: meId,
        text: textToSend
      };

      if (isProjectChat) {
        insertObj.project_id = projectId;
      } else {
        insertObj.receiver_id = id;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert(insertObj)
        .select('*')
        .single();

      if (error) {
        console.error('Error saving message in Supabase:', error.message);
      } else if (data) {
        // Replace temp optimistic message with real message from DB
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  id: data.id,
                  text: data.text,
                  is_read: data.is_read,
                  sender: 'me',
                  time: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  created_at: data.created_at,
                }
              : m
          )
        );

        // Notif in-app + push (deep link vers le fil)
        const { notifyUser } = await import('../../lib/activity');
        if (isProjectChat && projectId) {
          // Inbox in-app pour chaque membre + push (opt-in via notifyUser)
          await Promise.all(
            projectMemberIds.map((uid) =>
              notifyUser({
                userId: uid,
                actorId: meId,
                type: 'message_received',
                title: `[Équipe] ${themProfile?.name || 'Projet'}`,
                body: `${myName}: ${textToSend.slice(0, 120)}`,
                route: `/chat/project-${projectId}`,
                refType: 'project',
                refId: projectId,
                push: true,
                throttle: false,
              })
            )
          );
          // Fallback push tokens déjà chargés (si notify n’a pas de token)
          if (projectTokens.length && projectMemberIds.length === 0) {
            const { sendPushNotification } = await import('../../lib/notifications');
            projectTokens.forEach((token) => {
              void sendPushNotification(
                token,
                `[Équipe] ${themProfile?.name || 'Projet'}`,
                `${myName}: ${textToSend}`,
                { route: `/chat/project-${projectId}` }
              );
            });
          }
        } else {
          await notifyUser({
            userId: String(id),
            actorId: meId,
            type: 'message_received',
            title: myName || 'Nouveau message',
            body: textToSend.slice(0, 140),
            route: `/chat/${meId}`,
            refType: 'profile',
            refId: meId || undefined,
            push: true,
            throttle: false,
          });
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  if (loading || !themProfile) {
    return (
      <View style={{ backgroundColor: colors.bg }} className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.turmeric} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ backgroundColor: colors.bg }} className="flex-1">
      {/* Header */}
      <View style={{ backgroundColor: colors.nav, borderBottomColor: colors.border }} className="h-16 flex-row items-center justify-between px-5 border-b">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={handleBack} style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-9 h-9 rounded-full border items-center justify-center">
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-10 h-10 rounded-full border items-center justify-center">
              <Text style={{ color: colors.text }} className="font-space text-xs font-bold">{themProfile.initials}</Text>
            </View>
            <View>
              <Text style={{ color: colors.text }} className="font-space text-sm font-bold">{themProfile.name}</Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] uppercase font-semibold">{themProfile.role}</Text>
            </View>
          </View>
        </View>

      </View>

      {/* Pinned Project Briefing (Floating Glassmorphism Card) */}
      {isProjectChat && themProfile && (
        <View className="px-4 pt-3 pb-1 z-10">
          <View 
            style={{
              backdropFilter: 'blur(20px)',
              backgroundColor: colors.card,
              borderColor: colors.border,
            } as any}
            className="border p-4 rounded-3xl gap-2"
          >
            {infoExpanded ? (
              <View className="gap-2.5 pb-1">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-turmeric text-[10px] font-bold uppercase tracking-wider">📌 Brief de l'équipe</Text>
                    <View style={{ backgroundColor: colors.deep, borderColor: colors.border }} className="px-1.5 py-0.5 rounded border">
                      <Text style={{ color: colors.textSecondary }} className="text-[8px] font-bold uppercase">{themProfile.status}</Text>
                    </View>
                  </View>
                  <Pressable 
                    onPress={() => setInfoExpanded(false)} 
                    style={{ backgroundColor: colors.deep, borderColor: colors.border }} className="px-2.5 py-1 rounded-xl border active:opacity-85"
                  >
                    <Text style={{ color: colors.textSecondary }} className="font-inter text-[9px] font-semibold">Masquer</Text>
                  </Pressable>
                </View>
                <Text style={{ color: colors.text }} className="font-inter text-xs leading-5">
                  {themProfile.description}
                </Text>
                <View className="flex-row justify-between items-center mt-1 pt-2 border-t border-malt/30">
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[9px]">Créé par <Text style={{ color: colors.text }} className="font-semibold">{themProfile.creator}</Text></Text>
                  <Pressable 
                    onPress={() => router.push(`/project/${projectId}`)}
                    className="bg-turmeric/10 border border-turmeric/35 px-3 py-1 rounded-lg active:opacity-85"
                  >
                    <Text className="text-turmeric font-inter-semibold text-[9px] font-semibold">Fiche Projet →</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable 
                onPress={() => setInfoExpanded(true)}
                className="flex-row justify-between items-center"
              >
                <Text style={{ color: colors.textSecondary }} className="font-inter text-xs flex-1 pr-2" numberOfLines={1}>
                  📌 <Text style={{ color: colors.text }} className="font-semibold">{themProfile.name}</Text> : {themProfile.description}
                </Text>
                <Text className="text-turmeric font-inter-bold text-xs font-bold">[Voir]</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Keyboard Avoiding Wrapper */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Messages Thread */}
        <ScrollView 
          ref={scrollViewRef}
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          onScroll={handleChatScroll}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (stickToBottomRef.current) {
              scrollViewRef.current?.scrollToEnd({ animated: false });
            }
          }}
        >
          {loadingOlder ? (
            <View className="py-2 items-center">
              <ActivityIndicator size="small" color={colors.turmeric} />
            </View>
          ) : hasMoreOlder ? (
            <Pressable onPress={() => void loadOlderMessages()} className="py-2 items-center">
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px]">
                Charger les messages précédents
              </Text>
            </Pressable>
          ) : null}

          {/* Introduction Card for 1-to-1 chats */}
          {!isProjectChat && (
            <View className="items-center py-6 mb-4 border-b border-malt/30 gap-3">
              <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="w-14 h-14 rounded-full border items-center justify-center">
                <Text style={{ color: colors.text }} className="font-space text-lg font-bold">{themProfile.initials}</Text>
              </View>
              <View className="items-center gap-1">
                <Text style={{ color: colors.text }} className="font-space text-sm font-bold text-center">{themProfile.name}</Text>
                <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] text-center uppercase tracking-wider">{themProfile.role}</Text>
              </View>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-[11px] text-center max-w-[85%] leading-4 mt-1">
                Début de votre conversation avec {themProfile.name}. Discutez de vos compétences et collaborez sur PIH Pulse.
              </Text>
            </View>
          )}

          {messages.map((msg) => {
            const isMe = msg.sender === 'me';
            return (
              <View 
                key={msg.id}
                className={`max-w-[80%] gap-1 ${isMe ? 'self-end items-end' : 'self-start items-start'}`}
              >
                {/* Sender Name for group chats */}
                {isProjectChat && !isMe && msg.senderName && (
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[10px] font-bold mb-0.5 ml-1">
                    {msg.senderName}
                  </Text>
                )}

                {/* Bubble */}
                <View 
                  className={`px-4 py-3 rounded-2xl border ${
                    isMe ? 'rounded-tr-none' : 'rounded-tl-none'
                  }`}
                  style={
                    isMe
                      ? {
                          backgroundColor: 'rgba(255, 190, 11, 0.12)',
                          borderColor: 'rgba(255, 190, 11, 0.28)',
                        }
                      : {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        }
                  }
                >
                  <Text style={{ color: colors.text }} className="font-inter text-sm leading-5">
                    {msg.text}
                  </Text>
                </View>
                
                {/* Time & Read Status */}
                <View className="flex-row items-center gap-1 px-1">
                  <Text style={{ color: colors.textSecondary }} className="font-inter text-[9px]">
                    {msg.time}
                  </Text>
                  {isMe && (
                    msg.id.startsWith('temp-') ? (
                      <ActivityIndicator size={6} color={colors.textSecondary} />
                    ) : msg.is_read ? (
                      <CheckCheck size={11} color={colors.turmeric} />
                    ) : (
                      <Check size={11} color={colors.textSecondary} />
                    )
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View style={{ backgroundColor: colors.nav, borderTopColor: colors.border }} className="flex-row items-center p-4 border-t gap-3">
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="flex-1 flex-row items-center border rounded-2xl px-4 h-12">
            <TextInput
              placeholder="Écrire votre message..."
              placeholderTextColor={colors.textSecondary}
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={handleSendMessage}
              style={{ color: colors.text }} className="flex-1 font-inter text-sm h-full"
            />
          </View>

          {/* Send Action */}
          <Pressable 
            onPress={handleSendMessage}
            className="w-12 h-12 rounded-xl bg-turmeric items-center justify-center active:opacity-90"
          >
            <Send size={18} color="#0D0B05" style={{ transform: [{ rotate: '30deg' }] }} />
          </Pressable>
        </View>

      </KeyboardAvoidingView>

      {/* Custom Alert Modal */}
      {modalVisible && (
        <View className="absolute inset-0 bg-black/70 items-center justify-center z-50 px-6">
          <View style={{ backgroundColor: colors.card, borderColor: colors.border }} className="border p-6 rounded-3xl w-full max-w-sm gap-4 items-center">
            {modalType === 'success' ? (
              <View className="w-12 h-12 rounded-full bg-kaki/15 border border-kaki/30 items-center justify-center">
                <CheckCircle size={24} color="#7CB87A" />
              </View>
            ) : (
              <View className="w-12 h-12 rounded-full bg-turmeric/10 border border-turmeric/30 items-center justify-center">
                <AlertTriangle size={24} color={colors.turmeric} />
              </View>
            )}
            
            <View className="items-center gap-1.5 w-full">
              <Text style={{ color: colors.text }} className="font-space text-lg font-bold text-center">{modalTitle}</Text>
              <Text style={{ color: colors.textSecondary }} className="font-inter text-xs text-center leading-5">{modalMessage}</Text>
            </View>
            
            <Pressable 
              onPress={() => setModalVisible(false)}
              className="bg-turmeric w-full py-3 rounded-xl items-center justify-center active:opacity-90 mt-2"
            >
              <Text className="text-malt-deep font-inter-bold text-sm font-bold">Compris</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
