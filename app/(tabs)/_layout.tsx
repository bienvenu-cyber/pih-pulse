import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { Home, Layers, Target, User, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import { AppState, Platform, Pressable, type AppStateStatus } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandedSplash } from '../../components/BrandedSplash';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { ensurePushRegistration } from '../../lib/notifications';
import { PRESENCE_HEARTBEAT_MS, touchLastSeen } from '../../lib/presence';
import { supabase } from '../../lib/supabase';

/** Tab button sans ripple Android (ombre grise visible en mode clair). */
function CleanTabButton(props: any) {
  const {
    children,
    onPress,
    onLongPress,
    accessibilityState,
    accessibilityLabel,
    testID,
    style,
    href: _href,
    ...rest
  } = props;

  return (
    <Pressable
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      android_ripple={{ color: 'transparent', borderless: false }}
      style={[{ flex: 1, opacity: 1 }, style]}
    >
      {children}
    </Pressable>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useThemeFlavor();
  const { ready } = useRequireAuth();
  const insets = useSafeAreaInsets();
  // Icônes seules : barre plus compacte (safe area + zone tactile)
  const tabBarHeight = 50 + Math.max(insets.bottom, Platform.OS === 'ios' ? 8 : 6);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    async function setupNotifications() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;
        // Re-sync token Expo (permission + DB) — requis pour push messages/réactions
        await ensurePushRegistration(user.id);
      } catch (error) {
        console.error('Error setting up push notifications on mount:', error);
      }
    }
    void setupNotifications();

    // Re-register au retour foreground (token peut changer après update OS)
    const onApp = (state: AppStateStatus) => {
      if (state === 'active') void setupNotifications();
    };
    const appSub = AppState.addEventListener('change', onApp);

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (route) router.push(route as any);
    });

    return () => {
      cancelled = true;
      appSub.remove();
      subscription.remove();
    };
  }, [router, ready]);

  useEffect(() => {
    if (!ready) return;
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
  }, [ready]);

  // Même branding splash pendant le check auth (pas de flash spinner).
  if (!ready) {
    return <BrandedSplash />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.turmeric,
        tabBarInactiveTintColor: colors.textSecondary,
        // Pas de fond actif / ripple gris (surtout visible en mode clair Android)
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarButton: (props) => <CleanTabButton {...props} />,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 8,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarAccessibilityLabel: 'Feed',
          tabBarIcon: ({ color }) => <Home size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projets',
          tabBarAccessibilityLabel: 'Projets',
          tabBarIcon: ({ color }) => <Layers size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="missions"
        options={{
          title: 'Missions',
          tabBarAccessibilityLabel: 'Missions',
          tabBarIcon: ({ color }) => <Target size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="teams"
        options={{
          title: 'Talents',
          tabBarAccessibilityLabel: 'Talents',
          tabBarIcon: ({ color }) => <Users size={22} color={color} strokeWidth={2} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarAccessibilityLabel: 'Profil',
          tabBarIcon: ({ color }) => <User size={22} color={color} strokeWidth={2} />,
        }}
      />
    </Tabs>
  );
}
