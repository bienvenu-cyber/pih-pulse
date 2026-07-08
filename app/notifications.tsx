import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Users, Layers, CheckCircle, Sparkles } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const notifsList: any[] = [];

      // 1. Fetch recently joined project members
      const { data: members, error: memError } = await supabase
        .from('project_members')
        .select(`
          created_at,
          role,
          projects(name),
          profiles(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!memError && members) {
        members.forEach((m: any, idx: number) => {
          const pName = m.projects?.name || 'Projet';
          const uName = m.profiles?.full_name || 'Un talent';
          
          notifsList.push({
            id: `mem-${idx}-${m.created_at}`,
            type: 'project_join',
            title: 'Nouveau collaborateur',
            desc: `${uName} a rejoint le projet ${pName} en tant que ${m.role || 'Collaborateur'}.`,
            time: formatTime(m.created_at),
            icon: Users,
            iconColor: '#7CB87A', // Kaki (success)
            route: '/(tabs)/teams',
            timestamp: new Date(m.created_at).getTime()
          });
        });
      }

      // 2. Fetch recently assigned missions
      const { data: missions, error: missError } = await supabase
        .from('missions')
        .select(`
          id,
          title,
          updated_at,
          projects(name),
          assignee:profiles!assignee_id(full_name)
        `)
        .isNotNull('assignee_id')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (!missError && missions) {
        missions.forEach((miss: any, idx: number) => {
          const pName = miss.projects?.name || 'Projet';
          const aName = miss.assignee?.full_name || 'Un talent';
          
          notifsList.push({
            id: `miss-${idx}-${miss.updated_at}`,
            type: 'mission_assign',
            title: 'Mission en cours',
            desc: `${aName} a commencé la mission "${miss.title}" sur le projet ${pName}.`,
            time: formatTime(miss.updated_at),
            icon: Layers,
            iconColor: '#FFBE0B', // Turmeric
            route: `/mission/${miss.id}`,
            timestamp: new Date(miss.updated_at).getTime()
          });
        });
      }

      // 3. System Welcome Notification (always present)
      notifsList.push({
        id: 'sys-welcome',
        type: 'system',
        title: 'Bienvenue sur Pulse !',
        desc: 'Parakou Innovation Hub vous souhaite la bienvenue. Complétez votre profil pour être visible des autres équipes.',
        time: 'Récemment',
        icon: Bell,
        iconColor: '#A39171', // Sable
        route: '/(tabs)/profile',
        timestamp: 0
      });

      // Sort notifications by timestamp (descending)
      notifsList.sort((a, b) => b.timestamp - a.timestamp);

      setNotifications(notifsList);
    } catch (err) {
      console.error('Error generating notifications feed:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const diffMs = Date.now() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Récemment';
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
  };

  const handleBack = () => {
    router.back();
  };

  const handleNotificationPress = (route: string) => {
    router.push(route);
  };

  if (loading) {
    return (
      <View className="flex-1 bg-malt-deep items-center justify-center">
        <ActivityIndicator size="large" color="#FFBE0B" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-malt-deep">
      {/* custom Header */}
      <View className="h-14 flex-row items-center justify-between px-6 bg-malt-nav border-b border-malt">
        <Pressable onPress={handleBack} className="w-9 h-9 rounded-full bg-malt-card border border-malt items-center justify-center">
          <ArrowLeft size={18} color="#F5EDD6" />
        </Pressable>
        <Text className="text-creme font-space text-base font-bold">Notifications</Text>
        <View className="w-9 h-9" />
      </View>

      {/* Notifications List */}
      <ScrollView 
        className="flex-1"
        contentContainerStyle={{ padding: 20, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 ? (
          notifications.map(notif => {
            const IconComponent = notif.icon;
            return (
              <Pressable
                key={notif.id}
                onPress={() => handleNotificationPress(notif.route)}
                className="flex-row items-start bg-malt-card border border-malt p-4 rounded-2xl gap-3 active:opacity-95"
              >
                {/* Icon Container */}
                <View className="w-10 h-10 rounded-xl bg-malt-deep border border-malt items-center justify-center mt-0.5">
                  <IconComponent size={16} color={notif.iconColor} />
                </View>

                {/* Text Details */}
                <View className="flex-1 gap-1">
                  <View className="flex-row justify-between items-baseline flex-wrap">
                    <Text className="text-creme font-space text-sm font-bold">{notif.title}</Text>
                    <Text className="text-sable font-inter text-[10px]">{notif.time}</Text>
                  </View>
                  <Text className="text-sable font-inter text-xs leading-4 mt-0.5">
                    {notif.desc}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          <View className="items-center py-12">
            <Text className="text-sable font-inter text-sm">Aucune notification pour le moment.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
