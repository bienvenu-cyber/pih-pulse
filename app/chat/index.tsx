import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Search, Check, CheckCheck, Send } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

export default function ChatInboxScreen() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [meId, setMeId] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      fetchConversations();
    }, [])
  );

  useEffect(() => {
    let activeChannel: any = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to any message insertion involving current user or group chats
      const channel = supabase
        .channel(`inbox-realtime-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            const newMsg = payload.new as any;
            const oldMsg = payload.old as any;
            
            const isRelevant = 
              (newMsg && (newMsg.sender_id === user.id || newMsg.receiver_id === user.id || newMsg.project_id !== null)) ||
              (oldMsg && (oldMsg.sender_id === user.id || oldMsg.receiver_id === user.id || oldMsg.project_id !== null));

            if (isRelevant) {
              fetchConversations();
            }
          }
        )
        .subscribe();

      activeChannel = channel;
    };

    setupRealtime();

    return () => {
      if (activeChannel) {
        supabase.removeChannel(activeChannel);
      }
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }
      setMeId(user.id);

      // Fetch user's joined projects first to filter group messages
      const { data: memberProjects } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id);
      
      const projectIds = (memberProjects || []).map(p => p.project_id);

      // 1. Fetch messages where user is sender/receiver or project is in user's projects
      let msgQuery = supabase
        .from('messages')
        .select(`
          id,
          text,
          created_at,
          sender_id,
          receiver_id,
          project_id,
          is_read,
          sender:profiles!sender_id(id, full_name, role),
          receiver:profiles!receiver_id(id, full_name, role),
          project:projects!project_id(id, name)
        `);

      if (projectIds.length > 0) {
        msgQuery = msgQuery.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id},project_id.in.(${projectIds.join(',')})`);
      } else {
        msgQuery = msgQuery.or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
      }

      const { data: msgs, error: msgsError } = await msgQuery.order('created_at', { ascending: false });

      if (msgsError) {
        console.error('Error fetching inbox messages:', msgsError);
        setLoading(false);
        return;
      }

      // 2. Process messages into unique conversations (Direct & Projects)
      const convMap = new Map<string, any>();
      
      (msgs || []).forEach((m: any) => {
        const isProject = m.project_id !== null;
        
        if (isProject) {
          const projId = `project-${m.project_id}`;
          if (!convMap.has(projId)) {
            const name = m.project?.name || 'Projet';
            const initials = name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'PR';

            const msgDate = new Date(m.created_at);
            const timeFormatted = msgDate.toLocaleDateString() === new Date().toLocaleDateString()
              ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : msgDate.toLocaleDateString([], { day: 'numeric', month: 'short' });

            const senderName = m.sender?.full_name || 'Membre';
            const lastText = `${senderName}: ${m.text}`;

            convMap.set(projId, {
              id: projId,
              name: name,
              role: "Projet d'Équipe",
              initials: initials,
              lastMessage: lastText,
              time: timeFormatted,
              unreadCount: 0,
              isLastMessageUnread: false,
              lastMessageSenderId: m.sender_id,
              isLastMessageRead: true,
              isGroup: true
            });
          }
        } else {
          // Direct 1-to-1 Chat
          const otherUser = m.sender_id === user.id ? m.receiver : m.sender;
          if (!otherUser) return;
          
          const otherId = otherUser.id;
          const isUnread = m.receiver_id === user.id && !m.is_read;
          
          if (!convMap.has(otherId)) {
            const name = otherUser.full_name || 'Talent';
            const initials = name
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase() || 'T';

            const msgDate = new Date(m.created_at);
            const timeFormatted = msgDate.toLocaleDateString() === new Date().toLocaleDateString()
              ? msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : msgDate.toLocaleDateString([], { day: 'numeric', month: 'short' });

            const roleFormatted = otherUser.role === 'product_creator' ? 'Product Owner' : 'Développeur';

            convMap.set(otherId, {
              id: otherId,
              name: name,
              role: roleFormatted,
              initials: initials,
              lastMessage: m.text,
              time: timeFormatted,
              unreadCount: isUnread ? 1 : 0,
              isLastMessageUnread: isUnread,
              lastMessageSenderId: m.sender_id,
              isLastMessageRead: m.is_read,
              isGroup: false
            });
          } else {
            if (isUnread) {
              const existing = convMap.get(otherId);
              existing.unreadCount += 1;
            }
          }
        }
      });

      const convList = Array.from(convMap.values());
      setConversations(convList);

      // 3. Fetch user suggestions (other profiles to start a discussion with)
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .neq('id', user.id)
        .limit(5);

      if (!profError && profiles) {
        const suggList = profiles
          .filter(p => !convMap.has(p.id)) // Filter out already open conversations
          .map(p => {
            const name = p.full_name || 'Talent';
            return {
              id: p.id,
              name: name,
              role: p.role === 'product_creator' ? 'Product Owner' : 'Développeur',
              initials: name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'T'
            };
          });
        setSuggestions(suggList);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.replace('/(tabs)');
  };

  const handleConversationPress = (userId: string) => {
    router.push(`/chat/${userId}`);
  };

  const filteredConversations = conversations.filter(conv => 
    conv.name.toLowerCase().includes(search.toLowerCase()) || 
    conv.role.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View className="flex-1 bg-malt-deep items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* Header */}
      <View className="h-14 flex-row items-center justify-between px-6 bg-malt-nav border-b border-malt">
        <Pressable onPress={handleBack} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
          <ArrowLeft size={18} color="#F5EDD6" />
        </Pressable>
        <Text className="text-creme font-space text-base font-bold">Messagerie</Text>
        <View className="w-9 h-9" />
      </View>

      {/* Search Bar */}
      <View className="px-5 pt-4 pb-3 bg-malt-nav border-b border-malt">
        <View className="flex-row items-center h-12 rounded-xl border px-3 gap-2 bg-malt-card border-malt">
          <Search size={16} color="#A39171" />
          <TextInput
            placeholder="Rechercher une discussion..."
            placeholderTextColor="#A39171"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-creme font-inter text-sm h-full"
          />
        </View>
      </View>

      {/* Conversations List */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {filteredConversations.length > 0 ? (
          <View className="gap-3">
            <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider ml-1">
              Discussions en cours
            </Text>
            {filteredConversations.map(conv => (
              <Pressable
                key={conv.id}
                onPress={() => handleConversationPress(conv.id)}
                className="flex-row items-center justify-between bg-malt-card border border-malt p-4 rounded-2xl active:opacity-95"
              >
                <View className="flex-row items-center gap-3 flex-1 pr-4">
                  <View className="w-12 h-12 rounded-full bg-malt-deep border border-malt items-center justify-center">
                    <Text className="text-creme font-space text-sm font-bold">{conv.initials}</Text>
                  </View>

                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-baseline gap-1.5 flex-wrap">
                      <Text className="text-creme font-space text-sm font-bold">{conv.name}</Text>
                      <Text className="text-sable font-inter text-[9px] uppercase font-semibold">{conv.role}</Text>
                    </View>
                    <Text 
                      className={`font-inter text-xs ${
                        conv.isLastMessageUnread ? 'text-creme font-bold' : 'text-sable'
                      }`} 
                      numberOfLines={1}
                    >
                      {conv.lastMessage}
                    </Text>
                  </View>
                </View>

                <View className="items-end gap-1.5">
                  <Text className={`font-inter text-[10px] ${conv.isLastMessageUnread ? 'text-turmeric font-semibold' : 'text-sable'}`}>
                    {conv.time}
                  </Text>
                  {conv.unreadCount > 0 ? (
                    <View className="bg-turmeric px-1.5 py-0.5 rounded-full min-w-[18px] items-center justify-center">
                      <Text className="text-malt-deep font-inter-bold text-[9px] font-bold">
                        {conv.unreadCount}
                      </Text>
                    </View>
                  ) : conv.lastMessageSenderId === meId ? (
                    conv.isLastMessageRead ? (
                      <CheckCheck size={14} color="#FFBE0B" />
                    ) : (
                      <Check size={14} color="#A39171" />
                    )
                  ) : null}
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {/* Suggestions list - Only show if there are no open conversations to keep the inbox clean */}
        {conversations.length === 0 && suggestions.length > 0 ? (
          <View className="gap-3 mt-2">
            <Text className="text-sable font-inter text-[10px] font-bold uppercase tracking-wider ml-1">
              Lancer une discussion
            </Text>
            <View className="gap-2">
              {suggestions.map(sugg => (
                <Pressable
                  key={sugg.id}
                  onPress={() => handleConversationPress(sugg.id)}
                  className="flex-row items-center justify-between bg-malt-card/50 border border-malt/50 p-3.5 rounded-2xl active:opacity-95"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-10 h-10 rounded-full bg-malt-deep border border-malt/50 items-center justify-center">
                      <Text className="text-creme font-space text-xs font-bold">{sugg.initials}</Text>
                    </View>
                    <View>
                      <Text className="text-creme font-space text-sm font-bold">{sugg.name}</Text>
                      <Text className="text-sable font-inter text-[10px]">{sugg.role}</Text>
                    </View>
                  </View>

                  <View className="bg-malt-deep border border-malt px-3 py-1.5 rounded-full flex-row items-center gap-1">
                    <Text className="text-creme font-inter text-[10px] font-bold">Message</Text>
                    <Send size={8} color="#F5EDD6" style={{ transform: [{ rotate: '30deg' }] }} />
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {conversations.length === 0 && suggestions.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-sable font-inter text-sm">Aucun membre disponible.</Text>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
