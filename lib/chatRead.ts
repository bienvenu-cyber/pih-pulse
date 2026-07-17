/**
 * Read model chat projet — curseurs par user × projet (S1).
 * DM continue d’utiliser messages.is_read (1 destinataire).
 */
import { supabase } from './supabase';

/** Marque le fil projet lu jusqu’à maintenant pour l’user courant. */
export async function markProjectChatRead(projectId: string): Promise<boolean> {
  if (!projectId) return false;
  const { error } = await supabase.rpc('mark_project_chat_read', {
    p_project_id: projectId,
  });
  if (error) {
    // RPC absente → fallback no-op (ne casse pas l’UI)
    if (error.code === 'PGRST202' || /function.*mark_project/i.test(error.message)) {
      console.warn('[chatRead] RPC mark not deployed — skip');
      return false;
    }
    console.warn('[chatRead] mark:', error.message);
    return false;
  }
  return true;
}

/** Total non-lus sur tous les chats projet de l’user. */
export async function countMyProjectChatUnread(): Promise<number> {
  const { data, error } = await supabase.rpc('count_my_project_chat_unread');
  if (error) {
    if (error.code === 'PGRST202' || /function.*count_my_project/i.test(error.message)) {
      return 0;
    }
    console.warn('[chatRead] count all:', error.message);
    return 0;
  }
  return typeof data === 'number' ? data : Number(data) || 0;
}

/** Map project_id → unread count (inbox). */
export async function countProjectChatUnreadBatch(
  projectIds: string[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  const ids = Array.from(new Set(projectIds.filter(Boolean))).slice(0, 80);
  if (!ids.length) return map;

  const { data, error } = await supabase.rpc('count_project_chat_unread_batch', {
    p_project_ids: ids,
  });
  if (error) {
    if (error.code === 'PGRST202' || /function.*count_project/i.test(error.message)) {
      return map;
    }
    console.warn('[chatRead] batch:', error.message);
    return map;
  }
  (data || []).forEach((row: any) => {
    if (row.project_id) {
      map.set(row.project_id, Number(row.unread_count) || 0);
    }
  });
  return map;
}
