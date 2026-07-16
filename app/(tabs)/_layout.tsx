import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { Home, Layers, Target, User, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { registerForPushNotificationsAsync, savePushToken } from '../../lib/notifications';
import { PRESENCE_HEARTBEAT_MS, touchLastSeen } from '../../lib/presence';
import { supabase } from '../../lib/supabase';

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useThemeFlavor();
  const insets = useSafeAreaInsets();
  const tabBarHeight = 52 + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6);

  useEffect(() => {
    async function setupNotifications() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: pref } = await supabase
          .from('profiles')
          .select('push_enabled')
          .eq('id', user.id)
          .maybeSingle();
        if (pref?.push_enabled === false) return;
        const token = await registerForPushNotificationsAsync();
        if (token) await savePushToken(user.id, token);
      } catch (error) {
        console.error('Error setting up push notifications on mount:', error);
      }
    }
    setupNotifications();

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (route) router.push(route as any);
    });

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const startHeartbeat = () => {
      void touchLastSeen();
      if (interval) clearInterval(interval);
      interval = setInterval(() => {
        void touchLastSeen();
      }, PRESENCE_HEARTBEAT_MS);
    };

    const stopHeartbeat = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    startHeartbeat();

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') startHeartbeat();
      else stopHeartbeat();
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      stopHeartbeat();
      sub.remove();
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.turmeric,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: Platform.OS === 'ios' ? 0 : 4,
        },
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarAccessibilityLabel: 'Feed',
          tabBarIcon: ({ color }) => <Home size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projets',
          tabBarAccessibilityLabel: 'Projets',
          tabBarIcon: ({ color }) => <Layers size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarAccessibilityLabel: 'Missions',
          tabBarIcon: ({ color }) => <Target size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Talents',
          tabBarAccessibilityLabel: 'Talents',
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profil',
          tabBarIcon: ({ color }) => <User size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
