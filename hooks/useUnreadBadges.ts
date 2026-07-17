import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { subscribeUserNotifications } from '../lib/activity';
import { countMyProjectChatUnread } from '../lib/chatRead';
import { supabase } from '../lib/supabase';

/**
 * Compteurs non-lus scalables :
 * - notifs : count head + realtime filtrée user
 * - chat DM : count head is_read=false
 * - chat projet : RPC curseurs (read model S1)
 * Poll de secours 60s si realtime down.
 */
export function useUnreadBadges(pollMs = 60_000) {
  const [notifCount, setNotifCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (mountedRef.current) {
          setNotifCount(0);
          setChatCount(0);
        }
        return;
      }

      const [notifRes, dmRes, projectUnread] = await Promise.all([
        supabase
          .from('activity_notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false)
          .is('project_id', null),
        countMyProjectChatUnread(),
      ]);

      if (mountedRef.current) {
        setNotifCount(notifRes.count ?? 0);
        setChatCount((dmRes.count ?? 0) + projectUnread);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let unsubNotifs: (() => void) | undefined;
    let msgChannel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      unsubNotifs = subscribeUserNotifications(user.id, () => {
        void refresh();
      });

      // Channel messages unique (évite re-on après subscribe)
      const msgTopic = `badge-msgs:${user.id}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ch = supabase.channel(msgTopic);
      // DM : filtre receiver_id
      ch.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => void refresh()
      );
      ch.on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => void refresh()
      );
      // Chat projet : pas de receiver_id — on rafraîchit le badge (RPC curseurs)
      // sur tout INSERT messages (filtre côté refresh / count head).
      ch.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const row = payload.new as { project_id?: string | null; sender_id?: string };
          if (row?.project_id && row.sender_id !== user.id) {
            void refresh();
          }
        }
      );
      if (cancelled) {
        void supabase.removeChannel(ch);
        return;
      }
      ch.subscribe();
      msgChannel = ch;
    })();

    void refresh();
    const id = setInterval(() => void refresh(), pollMs);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void refresh();
    });

    return () => {
      cancelled = true;
      mountedRef.current = false;
      clearInterval(id);
      sub.remove();
      unsubNotifs?.();
      if (msgChannel) void supabase.removeChannel(msgChannel);
    };
  }, [refresh, pollMs]);

  return { notifCount, chatCount, refreshBadges: refresh };
}
