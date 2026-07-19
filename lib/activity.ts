/**
 * Activité in-app + push — source unique pour deep links.
 *
 * Scalabilité (100k+) :
 * - Inserts indexés (user_id, is_read, created_at)
 * - Compteurs via count head (pas de full scan)
 * - Realtime filtrée par user_id (pas de broadcast global)
 * - Push via Edge Function `send-push` (fallback client si non déployée)
 * - Throttle réactions (1 notif / acteur×ref / heure)
 * - Opt-out push_enabled / reminders_enabled respectés
 */
import { sendPushBatch, type ExpoPushMessage } from './notifications';
import { supabase } from './supabase';

/**
 * Push serveur (Edge) + fallback Expo client.
 * Important : si l’Edge répond OK mais `sent: 0` (tokens absents côté service,
 * ou function stub), on retente côté client — ne jamais `return` trop tôt.
 * Ne bloque jamais le flux notif in-app.
 */
async function dispatchPush(opts: {
  userIds: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<void> {
  const userIds = Array.from(new Set(opts.userIds.filter(Boolean))).slice(0, 100);
  if (!userIds.length) return;

  let edgeSent = 0;
  try {
    const { data, error } = await supabase.functions.invoke('send-push', {
      body: {
        userIds,
        title: opts.title,
        body: opts.body,
        data: opts.data || {},
      },
    });
    if (!error && data && typeof data === 'object') {
      edgeSent = Number((data as { sent?: number }).sent) || 0;
      if (edgeSent > 0) return;
      // sent:0 → tokens manquants côté edge, on retente client
    } else if (error) {
      console.warn('[push] edge:', error.message);
    }
  } catch (e) {
    console.warn('[push] edge unavailable, client fallback', e);
  }

  // Fallback / complément client : tokens lisibles (profiles public) + Expo API
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, expo_push_token, push_enabled')
      .in('id', userIds);

    const messages: ExpoPushMessage[] = [];
    (profiles || []).forEach((p: any) => {
      if (p.push_enabled === false) return;
      const token = p.expo_push_token;
      if (!token || typeof token !== 'string' || token.length < 20) return;
      messages.push({
        to: token,
        title: opts.title,
        body: opts.body,
        data: opts.data,
        sound: 'default',
        channelId: 'default',
        priority: 'high',
      });
    });
    if (messages.length) {
      const result = await sendPushBatch(messages);
      if (__DEV__) {
        console.log('[push] client sent', messages.length, 'edgeSent=', edgeSent, result);
      }
    } else if (__DEV__) {
      console.warn('[push] no tokens for users', userIds, 'edgeSent=', edgeSent);
    }
  } catch (e) {
    console.warn('[push] client fallback failed:', e);
  }
}

export type ActivityType =
  | 'mission_applied'
  | 'mission_approved'
  | 'mission_rejected'
  | 'mission_submitted'
  | 'mission_validated'
  | 'mission_changes'
  | 'project_joined'
  | 'project_status'
  | 'project_invite'
  | 'message_received'
  | 'boost_received'
  | 'reaction_received'
  | 'reply_received'
  | 'reply_mention'
  | 'reply_useful'
  | 'reply_pinned'
  | 'system';

export type ActivityRefType =
  | 'project'
  | 'mission'
  | 'event'
  | 'profile'
  | 'post'
  | 'reply';

export interface NotifyParams {
  userId: string;
  actorId?: string | null;
  type: ActivityType;
  title: string;
  body: string;
  route?: string;
  refId?: string;
  refType?: ActivityRefType;
  /** Push device (défaut true). In-app toujours écrit. */
  push?: boolean;
  /** Évite le spam (défaut true pour reaction_*) */
  throttle?: boolean;
}

export interface ActivityNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: ActivityType | string;
  title: string;
  body: string;
  route: string | null;
  ref_id: string | null;
  ref_type: string | null;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

const REMINDER_TYPES = new Set<ActivityType>([
  'mission_submitted',
  'mission_changes',
  'mission_validated',
]);

const THROTTLE_TYPES = new Set<ActivityType>([
  'reaction_received',
  'boost_received',
]);

/** Enregistre une notif en DB + push optionnel */
export async function notifyUser(params: NotifyParams): Promise<string | null> {
  const {
    userId,
    actorId = null,
    type,
    title,
    body,
    route = null,
    refId = null,
    refType = null,
    push = true,
    throttle,
  } = params;

  if (!userId) return null;
  // Jamais de notif à soi-même
  if (actorId && actorId === userId) return null;

  const shouldThrottle =
    throttle !== undefined ? throttle : THROTTLE_TYPES.has(type);

  if (shouldThrottle && actorId && refId) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('activity_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('actor_id', actorId)
      .eq('type', type)
      .eq('ref_id', refId)
      .gte('created_at', since);
    if ((count ?? 0) > 0) return null;
  }

  const { data, error } = await supabase
    .from('activity_notifications')
    .insert({
      user_id: userId,
      actor_id: actorId,
      type,
      title,
      body,
      route,
      ref_id: refId,
      ref_type: refType,
    })
    .select('id')
    .single();

  if (error) {
    console.warn('activity_notifications insert failed:', error.message);
    return null;
  }

  if (!push) return data?.id ?? null;

  // Push en fire-and-forget : n’empêche pas l’UI si Expo/Edge est lent
  void (async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('expo_push_token, push_enabled, reminders_enabled')
        .eq('id', userId)
        .maybeSingle();

      if (profile?.push_enabled === false) return;

      if (REMINDER_TYPES.has(type) && profile?.reminders_enabled === false) {
        return;
      }

      await dispatchPush({
        userIds: [userId],
        title,
        body,
        data: {
          route: route || undefined,
          type,
          notificationId: data?.id,
          refId: refId || undefined,
        },
      });
    } catch (e) {
      console.warn('push notify failed:', e);
    }
  })();

  return data?.id ?? null;
}

/** Notifie plusieurs users (ex. équipe projet) — bulk insert + 1 push edge */
export async function notifyMany(
  userIds: string[],
  params: Omit<NotifyParams, 'userId'>
): Promise<void> {
  const unique = Array.from(
    new Set(userIds.filter((id) => id && id !== params.actorId))
  ).slice(0, 100);
  if (!unique.length) return;

  // 1) RPC bulk si dispo
  const { error: rpcErr } = await supabase.rpc('notify_many_users', {
    p_user_ids: unique,
    p_actor_id: params.actorId || null,
    p_type: params.type,
    p_title: params.title,
    p_body: params.body,
    p_route: params.route || null,
    p_ref_id: params.refId || null,
    p_ref_type: params.refType || null,
  });

  if (rpcErr) {
    // 2) Fallback multi-insert unique requête (chunks 50)
    const rows = unique.map((userId) => ({
      user_id: userId,
      actor_id: params.actorId || null,
      type: params.type,
      title: params.title,
      body: params.body,
      route: params.route || null,
      ref_id: params.refId || null,
      ref_type: params.refType || null,
    }));
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const { error } = await supabase.from('activity_notifications').insert(chunk);
      if (error) console.warn('[notifyMany] insert chunk:', error.message);
    }
  }

  if (params.push === false) return;

  await dispatchPush({
    userIds: unique,
    title: params.title,
    body: params.body,
    data: {
      route: params.route || undefined,
      type: params.type,
      refId: params.refId || undefined,
    },
  });
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!id || String(id).startsWith('sys-')) return;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('activity_notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) console.warn('[notifs] mark read:', error.message);
  } catch (e) {
    console.warn('[notifs] mark read failed:', e);
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('activity_notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) console.warn('[notifs] mark all:', error.message);
  } catch (e) {
    console.warn('[notifs] mark all failed:', e);
  }
}

export async function fetchUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('activity_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  return count ?? 0;
}

/** Cache mémoire session — affichage instantané au re-focus. */
let notifSessionCache: {
  userId: string;
  items: ActivityNotification[];
  at: number;
} | null = null;

export function getCachedNotifications(userId: string): ActivityNotification[] | null {
  if (!notifSessionCache || notifSessionCache.userId !== userId) return null;
  // 5 min de fraîcheur pour hydrater l’UI (revalidation en arrière-plan)
  if (Date.now() - notifSessionCache.at > 5 * 60_000) return null;
  return notifSessionCache.items;
}

function setCachedNotifications(userId: string, items: ActivityNotification[]) {
  notifSessionCache = { userId, items, at: Date.now() };
}

export async function fetchNotifications(
  userId: string,
  opts?: { limit?: number; before?: string }
): Promise<{ rows: ActivityNotification[]; hasMore: boolean }> {
  if (!userId) return { rows: [], hasMore: false };
  const limit = Math.min(Math.max(opts?.limit ?? 30, 1), 80);

  try {
    let q = supabase
      .from('activity_notifications')
      .select(
        `
      id, user_id, actor_id, type, title, body, route, ref_id, ref_type, is_read, created_at,
      actor:profiles!actor_id(id, full_name, avatar_url)
    `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (opts?.before) {
      q = q.lt('created_at', opts.before);
    }

    const { data, error } = await q;
    if (error) {
      // Fallback sans join actor
      let basicQ = supabase
        .from('activity_notifications')
        .select(
          'id, user_id, actor_id, type, title, body, route, ref_id, ref_type, is_read, created_at'
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (opts?.before) basicQ = basicQ.lt('created_at', opts.before);
      const basic = await basicQ;
      if (basic.error) {
        console.warn('[notifs]', basic.error.message);
        return { rows: [], hasMore: false };
      }
      const rows = (basic.data || []) as ActivityNotification[];
      if (!opts?.before) setCachedNotifications(userId, rows);
      return { rows, hasMore: rows.length >= limit };
    }

    const rows = (data || []).map((row: any) => ({
      ...row,
      actor: Array.isArray(row.actor) ? row.actor[0] ?? null : row.actor ?? null,
    })) as ActivityNotification[];

    if (!opts?.before) setCachedNotifications(userId, rows);
    return { rows, hasMore: rows.length >= limit };
  } catch (e) {
    console.warn('[notifs] fetch failed:', e);
    return { rows: [], hasMore: false };
  }
}

/**
 * Realtime notifs pour un user (INSERT + UPDATE is_read).
 * Filtre server-side user_id = uid.
 *
 * Important : nom de channel **unique** à chaque abonnement.
 * Réutiliser `notifs:${userId}` après un subscribe() (Strict Mode /
 * double mount) provoque :
 * "cannot add postgres_changes callbacks … after subscribe()"
 */
export function subscribeUserNotifications(
  userId: string,
  onChange: () => void
): () => void {
  // Retire d’éventuels channels notifs orphelins pour ce user
  try {
    const prefix = `notifs:${userId}`;
    for (const ch of supabase.getChannels()) {
      const topic = (ch as { topic?: string }).topic || '';
      if (topic.includes(prefix) || topic.endsWith(prefix)) {
        void supabase.removeChannel(ch);
      }
    }
  } catch {
    /* ignore */
  }

  const topic = `notifs:${userId}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase.channel(topic);

  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'activity_notifications',
      filter: `user_id=eq.${userId}`,
    },
    () => onChange()
  );

  channel.subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
