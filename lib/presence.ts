/**
 * Présence « En ligne » — heartbeat last_seen_at.
 * Visible publiquement seulement si show_online_presence = true
 * et last_seen_at < 5 min (voir isUserOnline).
 */
import { supabase } from './supabase';

/** Fenêtre d’activité (doit matcher isUserOnline) */
export const ONLINE_WINDOW_MS = 5 * 60 * 1000;

/** Intervalle de heartbeat app ouverte */
export const PRESENCE_HEARTBEAT_MS = 2 * 60 * 1000;

/**
 * Met à jour last_seen_at pour l’utilisateur courant.
 * Best-effort : ignore colonnes absentes / hors ligne.
 */
export async function touchLastSeen(userId?: string | null): Promise<void> {
  try {
    let uid = userId ?? null;
    if (!uid) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      uid = user?.id ?? null;
    }
    if (!uid) return;

    const { error } = await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', uid);

    if (error) {
      // Migration non jouée ou RLS — silencieux
      console.warn('[presence] last_seen_at:', error.message);
    }
  } catch (e) {
    console.warn('[presence]', e);
  }
}
