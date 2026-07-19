import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure how notifications are handled when the app is in the foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (e) {
  console.warn('expo-notifications native module not available (old dev build):', e);
}

function getExpoProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    '08e66b61-f9d2-4951-aef5-d6e62f60f922'
  );
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    console.log('[push] Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[push] Permission not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'PIH Pulse',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFBE0B',
        sound: 'default',
      });
    }

    const projectId = getExpoProjectId();
    const token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      )
    ).data;

    if (__DEV__) console.log('[push] token registered', token?.slice(0, 28) + '…');
    return token;
  } catch (error) {
    console.error('[push] register error:', error);
    return null;
  }
}

/**
 * Enregistre le token si push non désactivé (re-sync au cold start / foreground).
 */
export async function ensurePushRegistration(userId: string): Promise<string | null> {
  if (!userId || Platform.OS === 'web') return null;
  try {
    const { data: pref } = await supabase
      .from('profiles')
      .select('push_enabled, expo_push_token')
      .eq('id', userId)
      .maybeSingle();
    if (pref?.push_enabled === false) return null;

    const token = await registerForPushNotificationsAsync();
    if (!token) return null;
    if (pref?.expo_push_token !== token) {
      await savePushToken(userId, token);
    }
    return token;
  } catch (e) {
    console.warn('[push] ensurePushRegistration:', e);
    return null;
  }
}

export async function savePushToken(userId: string, token: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token, push_enabled: true })
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token to database:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in savePushToken:', error);
    return false;
  }
}

/** Préférence push seule (même sans token — web / simulateur) */
export async function setPushPreference(
  userId: string,
  enabled: boolean
): Promise<boolean> {
  try {
    const payload: Record<string, unknown> = { push_enabled: enabled };
    if (!enabled) payload.expo_push_token = null;
    const { error } = await supabase.from('profiles').update(payload).eq('id', userId);
    if (error) {
      console.error('setPushPreference:', error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Active les notifs : flag ON + token si possible.
 * Sur web/simu : flag reste ON même sans token (in-app notifs).
 */
export async function enablePushNotifications(
  userId: string
): Promise<{ ok: boolean; token: string | null; reason?: string }> {
  const prefOk = await setPushPreference(userId, true);
  if (!prefOk) {
    return { ok: false, token: null, reason: 'db' };
  }

  if (Platform.OS === 'web') {
    return { ok: true, token: null, reason: 'web' };
  }

  const token = await registerForPushNotificationsAsync();
  if (token) {
    await savePushToken(userId, token);
    return { ok: true, token };
  }

  // Préférence activée, token indisponible (simu / permission)
  return { ok: true, token: null, reason: 'no_token' };
}

/** Désactive les push (flag + token) */
export async function disablePushNotifications(userId: string): Promise<boolean> {
  return setPushPreference(userId, false);
}

export async function getPushPermissionStatus(): Promise<
  'granted' | 'denied' | 'undetermined' | 'unavailable'
> {
  if (Platform.OS === 'web') return 'unavailable';
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    if (status === 'denied') return 'denied';
    return 'undetermined';
  } catch {
    return 'unavailable';
  }
}

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  /** Android channel (doit matcher setNotificationChannelAsync) */
  channelId?: string;
  priority?: 'default' | 'normal' | 'high';
};

/** 1 notif (compat) */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  return sendPushBatch([
    { to: token, title, body, data, sound: 'default' },
  ]);
}

/**
 * Batch Expo Push (max 100 / requête — scale 100k via chunks).
 * https://docs.expo.dev/push-notifications/sending-notifications/
 */
export async function sendPushBatch(
  messages: ExpoPushMessage[]
): Promise<unknown> {
  const valid = messages.filter((m) => m.to && typeof m.to === 'string');
  if (!valid.length) return null;

  try {
    const chunks: ExpoPushMessage[][] = [];
    for (let i = 0; i < valid.length; i += 100) {
      chunks.push(valid.slice(i, i + 100));
    }

    const results = [];
    for (const chunk of chunks) {
      const payload = chunk.map((m) => ({
        to: m.to,
        title: m.title,
        body: m.body,
        data: m.data || {},
        sound: m.sound ?? 'default',
        badge: m.badge,
        channelId: m.channelId || 'default',
        priority: m.priority || 'high',
      }));
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (__DEV__ && !response.ok) {
        console.warn('[push] Expo API error', response.status, json);
      }
      results.push(json);
    }
    return results;
  } catch (error) {
    console.error('Error sending push batch:', error);
    return null;
  }
}

/**
 * Push vers N users (fetch tokens + batch).
 * Respecte push_enabled.
 */
export async function sendPushToUserIds(
  userIds: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return;

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, expo_push_token, push_enabled')
    .in('id', ids);

  const messages: ExpoPushMessage[] = [];
  (profiles || []).forEach((p: any) => {
    if (p.push_enabled === false) return;
    if (!p.expo_push_token) return;
    messages.push({
      to: p.expo_push_token,
      title,
      body,
      data,
      sound: 'default',
    });
  });

  if (messages.length) await sendPushBatch(messages);
}
