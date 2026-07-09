import { Tabs, useRouter } from 'expo-router';
import { View, Pressable, DeviceEventEmitter, Platform } from 'react-native';
import { Bell, Send, Home, Layers, Target, Users, User } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { supabase } from '../../lib/supabase';
import { registerForPushNotificationsAsync, savePushToken } from '../../lib/notifications';

export default function TabLayout() {
  const router = useRouter();
  const [themeFlavor, setThemeFlavor] = useState<'malt' | 'oled' | 'light'>('malt');

  useEffect(() => {
    async function setupNotifications() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken(user.id, token);
        }
      } catch (error) {
        console.error('Error setting up push notifications on mount:', error);
      }
    }
    setupNotifications();

    // Load saved theme flavor safely (web compatibility)
    async function loadSavedTheme() {
      try {
        const val = Platform.OS === 'web'
          ? localStorage.getItem('theme_flavor')
          : await SecureStore.getItemAsync('theme_flavor');
        if (val === 'oled' || val === 'malt' || val === 'light') {
          setThemeFlavor(val as any);
        }
      } catch (e) {
        console.warn('Could not load theme flavor:', e);
      }
    }
    loadSavedTheme();

    // Listen for notification clicks and redirect accordingly
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const route = response.notification.request.content.data?.route;
      if (route) {
        router.push(route);
      }
    });

    // Listen for theme flavor changes
    const subTheme = DeviceEventEmitter.addListener('THEME_FLAVOR_CHANGED', (flavor) => {
      if (flavor === 'oled' || flavor === 'malt' || flavor === 'light') {
        setThemeFlavor(flavor);
      }
    });

    return () => {
      subscription.remove();
      subTheme.remove();
    };
  }, []);

  const isLight = themeFlavor === 'light';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isLight ? '#D9A000' : '#FFBE0B', // Or / Turmeric
        tabBarInactiveTintColor: isLight ? '#705F40' : '#A39171', // Sable-foncé / Sable
        tabBarStyle: {
          backgroundColor: isLight 
            ? 'rgba(240, 234, 214, 0.85)' // Translucent light cream
            : (themeFlavor === 'oled' ? 'rgba(0, 0, 0, 0.85)' : 'rgba(8, 7, 3, 0.8)'),
          borderTopColor: isLight ? '#E6DCBD' : (themeFlavor === 'oled' ? '#1F1F1F' : '#261F12'),
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          // Glassmorphism for web preview
          backdropFilter: 'blur(20px)',
          webkitBackdropFilter: 'blur(20px)',
        } as any,
        headerStyle: {
          backgroundColor: 'rgba(8, 7, 3, 0.8)', // Translucent Malt noir
          borderBottomColor: '#261F12', // Malt bordure
          borderBottomWidth: 1,
          // Glassmorphism for web preview
          backdropFilter: 'blur(20px)',
          webkitBackdropFilter: 'blur(20px)',
        } as any,
        headerTitleStyle: {
          color: '#F5EDD6', // Crème
          fontFamily: 'SpaceGrotesk700',
          fontWeight: '700',
        },
        headerTintColor: '#F5EDD6',
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 16, alignItems: 'center' }}>
            <Pressable 
              onPress={() => router.push('/notifications')}
              style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 18, 
                backgroundColor: '#18140B', 
                borderWidth: 1, 
                borderColor: '#261F12', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Bell size={16} color="#A39171" />
            </Pressable>
            <Pressable 
              onPress={() => router.push('/chat')}
              style={{ 
                width: 36, 
                height: 36, 
                borderRadius: 18, 
                backgroundColor: '#18140B', 
                borderWidth: 1, 
                borderColor: '#261F12', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Send size={14} color="#A39171" style={{ transform: [{ rotate: '30deg' }, { translateX: -1 }, { translateY: -1 }] }} />
            </Pressable>
          </View>
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          headerTitle: 'PIH Pulse',
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projets',
          headerTitle: 'Projets',
          tabBarIcon: ({ color }) => <Layers size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          headerTitle: 'Missions',
          tabBarIcon: ({ color }) => <Target size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Équipes',
          headerTitle: 'Équipes',
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerTitle: 'Profil',
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
