import React, { useState, useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Send, Check, CheckCheck, Phone, Video } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { sendPushNotification } from '../../lib/notifications';

export default function ChatRoomScreen() {
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
  
  const handleCallPress = () => {
    showModal(
      "Bientôt disponible",
      "Les appels audio et vidéo seront bientôt disponibles sur PIH Pulse !",
      "info"
    );
  };
  const [themProfile, setThemProfile] = useState<any>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [myName, setMyName] = useState('Un collaborateur');
  const [projectTokens, setProjectTokens] = useState<string[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [infoExpanded, setInfoExpanded] = useState(true);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const isProjectChat = typeof id === 'string' && id.startsWith('project-');
  const projectId = isProjectChat ? id.replace('project-', '') : null;

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
              creator: proj.creator?.full_name || 'Inconnu'
            });
          }

          // 2b. Fetch project members to cache their names and tokens
          const { data: members, error: memError } = await supabase
            .from('project_members')
            .select('user_id, profiles(full_name, expo_push_token)')
            .eq('project_id', projectId);

          if (!memError && members) {
            const names: Record<string, string> = {};
            const tokens: string[] = [];
            members.forEach((m: any) => {
              if (m.profiles) {
                names[m.user_id] = m.profiles.full_name || 'Collaborateur';
                if (m.user_id !== user.id && m.profiles.expo_push_token) {
                  tokens.push(m.profiles.expo_push_token);
                }
              }
            });
            setMemberNames(names);
            setProjectTokens(tokens);
          }

          // 3. Fetch project message history
          const { data: msgs, error: msgsError } = await supabase
            .from('messages')
            .select('*, sender:profiles!sender_id(id, full_name)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

          if (msgsError) {
            console.error('Error fetching project messages:', msgsError);
          } else if (msgs) {
            const formatted = msgs.map((m: any) => ({
              id: m.id,
              text: m.text,
              is_read: m.is_read,
              sender: m.sender_id === user.id ? 'me' : 'them',
              senderName: m.sender?.full_name || 'Collaborateur',
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(formatted);
          }

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
                          time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

          // 3. Fetch message thread history
          const { data: msgs, error: msgsError } = await supabase
            .from('messages')
            .select('*')
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${user.id})`)
            .order('created_at', { ascending: true });

          if (msgsError) {
            console.error('Error fetching messages:', msgsError);
          } else if (msgs) {
            const formatted = msgs.map((m: any) => ({
              id: m.id,
              text: m.text,
              is_read: m.is_read,
              sender: m.sender_id === user.id ? 'me' : 'them',
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));
            setMessages(formatted);
          }

          // Mark all messages from them to me as read in the DB since we just opened this chat
          await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('sender_id', id)
            .eq('receiver_id', user.id)
            .eq('is_read', false);

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
                          time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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

  const handleSendMessage = async () => {
    if (inputMessage.trim() === '' || !meId) return;

    const textToSend = inputMessage.trim();
    setInputMessage('');

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const localMsg = {
      id: tempId,
      text: textToSend,
      sender: 'me',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

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
                  time: new Date(data.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              : m
          )
        );

        // Trigger push notifications
        if (isProjectChat) {
          projectTokens.forEach((token) => {
            sendPushNotification(
              token,
              `[Équipe] ${themProfile.name}`,
              `${myName}: ${textToSend}`,
              { route: `/chat/${id}` }
            );
          });
        } else {
          if (themProfile.expo_push_token) {
            sendPushNotification(
              themProfile.expo_push_token,
              myName,
              textToSend,
              { route: `/chat/${meId}` }
            );
          }
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  if (loading || !themProfile) {
    return (
      <View className="flex-1 bg-malt-deep items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* Header */}
      <View className="h-16 flex-row items-center justify-between px-5 bg-malt-nav border-b border-malt">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={handleBack} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
            <ArrowLeft size={18} color="#F5EDD6" />
          </Pressable>
          <View className="flex-row items-center gap-2">
            <View className="w-10 h-10 rounded-full bg-malt-card border border-malt items-center justify-center">
              <Text className="text-creme font-space text-xs font-bold">{themProfile.initials}</Text>
            </View>
            <View>
              <Text className="text-creme font-space text-sm font-bold">{themProfile.name}</Text>
              <Text className="text-sable font-inter text-[10px] uppercase font-semibold">{themProfile.role}</Text>
            </View>
          </View>
        </View>

        {/* Call placeholders */}
        <View className="flex-row items-center gap-3">
          <Pressable 
            onPress={handleCallPress} 
            className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center active:opacity-85"
          >
            <Phone size={16} color="#A39171" />
          </Pressable>
          <Pressable 
            onPress={handleCallPress} 
            className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center active:opacity-85"
          >
            <Video size={16} color="#A39171" />
          </Pressable>
        </View>
      </View>

      {/* Pinned Project Briefing (Floating Glassmorphism Card) */}
      {isProjectChat && themProfile && (
        <View className="px-4 pt-3 pb-1 z-10">
          <View 
            style={{ 
              backdropFilter: 'blur(20px)', 
              webkitBackdropFilter: 'blur(20px)' 
            } as any}
            className="bg-malt-card/75 border border-turmeric/15 p-4 rounded-3xl gap-2"
          >
            {infoExpanded ? (
              <View className="gap-2.5 pb-1">
                <View className="flex-row justify-between items-center">
                  <View className="flex-row items-center gap-1.5">
                    <Text className="text-turmeric text-[10px] font-bold uppercase tracking-wider">📌 Brief de l'équipe</Text>
                    <View className="bg-malt-deep/60 px-1.5 py-0.5 rounded border border-malt/50">
                      <Text className="text-sable text-[8px] font-bold uppercase">{themProfile.status}</Text>
                    </View>
                  </View>
                  <Pressable 
                    onPress={() => setInfoExpanded(false)} 
                    className="px-2.5 py-1 rounded-xl bg-malt-deep/60 border border-malt/50 active:opacity-85"
                  >
                    <Text className="text-sable font-inter text-[9px] font-semibold">Masquer</Text>
                  </Pressable>
                </View>
                <Text className="text-creme font-inter text-xs leading-5">
                  {themProfile.description}
                </Text>
                <View className="flex-row justify-between items-center mt-1 pt-2 border-t border-malt/30">
                  <Text className="text-sable font-inter text-[9px]">Créé par <Text className="text-creme font-semibold">{themProfile.creator}</Text></Text>
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
                <Text className="text-sable font-inter text-xs flex-1 pr-2" numberOfLines={1}>
                  📌 <Text className="text-creme font-semibold">{themProfile.name}</Text> : {themProfile.description}
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
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Introduction Card for 1-to-1 chats */}
          {!isProjectChat && (
            <View className="items-center py-6 mb-4 border-b border-malt/30 gap-3">
              <View className="w-14 h-14 rounded-full bg-malt-card border border-malt items-center justify-center">
                <Text className="text-creme font-space text-lg font-bold">{themProfile.initials}</Text>
              </View>
              <View className="items-center gap-1">
                <Text className="text-creme font-space text-sm font-bold text-center">{themProfile.name}</Text>
                <Text className="text-sable font-inter text-[10px] text-center uppercase tracking-wider">{themProfile.role}</Text>
              </View>
              <Text className="text-sable font-inter text-[11px] text-center max-w-[85%] leading-4 mt-1">
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
                  <Text className="text-sable font-inter text-[10px] font-bold mb-0.5 ml-1">
                    {msg.senderName}
                  </Text>
                )}

                {/* Bubble */}
                <View 
                  className={`px-4 py-3 rounded-2xl border ${
                    isMe 
                      ? 'bg-turmeric/10 border-turmeric/20 rounded-tr-none' 
                      : 'bg-malt-card border-malt rounded-tl-none'
                  }`}
                >
                  <Text className="text-creme font-inter text-sm leading-5">
                    {msg.text}
                  </Text>
                </View>
                
                {/* Time & Read Status */}
                <View className="flex-row items-center gap-1 px-1">
                  <Text className="text-sable font-inter text-[9px]">
                    {msg.time}
                  </Text>
                  {isMe && (
                    msg.id.startsWith('temp-') ? (
                      <ActivityIndicator size={6} color="#A39171" />
                    ) : msg.is_read ? (
                      <CheckCheck size={11} color="#FFBE0B" />
                    ) : (
                      <Check size={11} color="#A39171" />
                    )
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>

        {/* Input Bar */}
        <View className="flex-row items-center p-4 bg-malt-nav border-t border-malt gap-3">
          <View className="flex-1 flex-row items-center border border-malt bg-malt-card rounded-2xl px-4 h-12">
            <TextInput
              placeholder="Écrire votre message..."
              placeholderTextColor="#A39171"
              value={inputMessage}
              onChangeText={setInputMessage}
              onSubmitEditing={handleSendMessage}
              className="flex-1 text-creme font-inter text-sm h-full"
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
          <View className="bg-malt-card border border-malt p-6 rounded-3xl w-full max-w-sm gap-4 items-center">
            {modalType === 'success' ? (
              <View className="w-12 h-12 rounded-full bg-kaki/15 border border-kaki/30 items-center justify-center">
                <CheckCircle size={24} color="#7CB87A" />
              </View>
            ) : (
              <View className="w-12 h-12 rounded-full bg-turmeric/10 border border-turmeric/30 items-center justify-center">
                <AlertTriangle size={24} color="#FFBE0B" />
              </View>
            )}
            
            <View className="items-center gap-1.5 w-full">
              <Text className="text-creme font-space text-lg font-bold text-center">{modalTitle}</Text>
              <Text className="text-sable font-inter text-xs text-center leading-5">{modalMessage}</Text>
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
