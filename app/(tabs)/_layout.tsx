import { BlurView } from 'expo-blur';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import { Home, Layers, Target, User, Users } from 'lucide-react-native';
import { useEffect } from 'react';
import {
  AppState,
  Platform,
  StyleSheet,
  View,
  type AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandedSplash } from '../../components/BrandedSplash';
import PressableScale from '../../components/ui/PressableScale';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useThemeFlavor } from '../../hooks/useThemeFlavor';
import { ensurePushRegistration } from '../../lib/notifications';
import { PRESENCE_HEARTBEAT_MS, touchLastSeen } from '../../lib/presence';
import { supabase } from '../../lib/supabase';

/** Tab button glass-friendly : scale + pas de ripple gris Android. */
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
    <PressableScale
      {...rest}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      scaleTo={0.94}
      android_ripple={{ color: 'transparent', borderless: false }}
      style={[{ flex: 1, opacity: 1 }, style]}
    >
      {children}
    </PressableScale>
  );
}

/**
 * Fond tab bar glass (iOS/Android) + hairline.
 * Web : solid semi-transparent.
 */
function GlassTabBarBackground() {
  const { isLight, flavor } = useThemeFlavor();
  const tint = isLight ? 'light' : 'dark';
  const overlay = isLight
    ? 'rgba(248, 245, 236, 0.55)'
    : flavor === 'dark'
      ? 'rgba(0, 0, 0, 0.55)'
      : 'rgba(13, 11, 5, 0.62)';
  const solid = isLight
    ? 'rgba(248, 245, 236, 0.94)'
    : flavor === 'dark'
      ? 'rgba(0, 0, 0, 0.94)'
      : 'rgba(8, 7, 3, 0.94)';
  const hairline = isLight ? 'rgba(13, 11, 5, 0.08)' : 'rgba(245, 237, 214, 0.12)';

  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: solid,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: hairline,
          },
        ]}
      />
    );
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 48 : 32}
        tint={tint}
        style={StyleSheet.absoluteFill}
        experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: StyleSheet.hairlineWidth,
          backgroundColor: hairline,
        }}
      />
    </View>
  );
}

export default function TabLayout() {
  const router = useRouter();
  const { colors } = useThemeFlavor();
  const { ready } = useRequireAuth();
  const insets = useSafeAreaInsets();
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
        await ensurePushRegistration(user.id);
      } catch (error) {
        console.error('Error setting up push notifications on mount:', error);
      }
    }
    void setupNotifications();

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
        tabBarActiveBackgroundColor: 'transparent',
        tabBarInactiveBackgroundColor: 'transparent',
        tabBarButton: (props) => <CleanTabButton {...props} />,
        tabBarBackground: () => <GlassTabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: tabBarHeight,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 8,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          shadowColor: 'transparent',
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
