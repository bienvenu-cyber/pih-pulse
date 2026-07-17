/**
 * Messages chat — pagination serveur (S0.4).
 * Charge les N plus récents, puis “plus anciens” via cursor created_at.
 */
import { supabase } from './supabase';

/** Messages par page (DM + projet) */
export const CHAT_PAGE_SIZE = 40;

export type ChatMessageRow = {
  id: string;
  text: string;
  is_read: boolean;
  sender_id: string;
  receiver_id?: string | null;
  project_id?: string | null;
  created_at: string;
  sender?: { id?: string; full_name?: string | null } | null;
};

function pickSender(raw: unknown): { id?: string; full_name?: string | null } | null {
  if (!raw) return null;
  return Array.isArray(raw) ? (raw[0] as any) ?? null : (raw as any);
}

/**
 * Page DM : derniers messages (order desc) puis reverse chrono pour l’UI.
 * `before` = created_at du plus ancien déjà chargé (load older).
 */
export async function fetchDmMessagesPage(opts: {
  meId: string;
  otherId: string;
  before?: string | null;
  limit?: number;
}): Promise<{ rows: ChatMessageRow[]; hasMore: boolean; error?: string }> {
  const limit = opts.limit ?? CHAT_PAGE_SIZE;
  const me = opts.meId;
  const other = opts.otherId;

  let q = supabase
    .from('messages')
    .select('id, text, is_read, sender_id, receiver_id, project_id, created_at')
    .is('project_id', null)
    .or(
      `and(sender_id.eq.${me},receiver_id.eq.${other}),and(sender_id.eq.${other},receiver_id.eq.${me})`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.before) {
    q = q.lt('created_at', opts.before);
  }

  const { data, error } = await q;
  if (error) {
    console.error('[messages] dm page:', error.message);
    return { rows: [], hasMore: false, error: error.message };
  }

  const rows = ((data || []) as ChatMessageRow[]).slice().reverse();
  return { rows, hasMore: (data || []).length >= limit };
}

/**
 * Page chat projet — avec join sender pour le nom.
 */
export async function fetchProjectMessagesPage(opts: {
  projectId: string;
  before?: string | null;
  limit?: number;
}): Promise<{ rows: ChatMessageRow[]; hasMore: boolean; error?: string }> {
  const limit = opts.limit ?? CHAT_PAGE_SIZE;

  let q = supabase
    .from('messages')
    .select(
      'id, text, is_read, sender_id, receiver_id, project_id, created_at, sender:profiles!sender_id(id, full_name)'
    )
    .eq('project_id', opts.projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (opts.before) {
    q = q.lt('created_at', opts.before);
  }

  const { data, error } = await q;
  if (error) {
    // Fallback sans join
    let bare = supabase
      .from('messages')
      .select('id, text, is_read, sender_id, receiver_id, project_id, created_at')
      .eq('project_id', opts.projectId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (opts.before) bare = bare.lt('created_at', opts.before);
    const res = await bare;
    if (res.error) {
      console.error('[messages] project page:', res.error.message);
      return { rows: [], hasMore: false, error: res.error.message };
    }
    const rows = ((res.data || []) as ChatMessageRow[]).slice().reverse();
    return { rows, hasMore: (res.data || []).length >= limit };
  }

  const rows = ((data || []) as any[]).map((m) => ({
    ...m,
    sender: pickSender(m.sender),
  })) as ChatMessageRow[];
  const chronological = rows.slice().reverse();
  return { rows: chronological, hasMore: (data || []).length >= limit };
}

export function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** UI bubble shape used by chat screen */
export function toUiMessage(
  row: ChatMessageRow,
  meId: string,
  opts?: { senderName?: string }
): {
  id: string;
  text: string;
  is_read: boolean;
  sender: 'me' | 'them';
  senderName?: string;
  time: string;
  created_at: string;
} {
  const isMe = row.sender_id === meId;
  return {
    id: row.id,
    text: row.text,
    is_read: !!row.is_read,
    sender: isMe ? 'me' : 'them',
    senderName:
      opts?.senderName ||
      row.sender?.full_name ||
      undefined,
    time: formatMessageTime(row.created_at),
    created_at: row.created_at,
  };
}
