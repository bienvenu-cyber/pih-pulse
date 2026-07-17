/**
 * Feed unifié — table hub_feed (boost_count + created_at).
 * Fallback multi-sources si table absente.
 */
import { supabase } from './supabase';
import type { MediaAsset } from './media';

export type HubFeedRow = {
  id: string;
  item_type: 'post' | 'project' | 'mission' | 'event';
  item_id: string;
  author_id: string | null;
  project_id: string | null;
  title: string;
  body: string | null;
  status: string | null;
  skills: string[] | null;
  media: MediaAsset[] | null;
  boost_count: number;
  created_at: string;
  author?: {
    id: string;
    full_name?: string | null;
    role?: string | null;
    avatar_url?: string | null;
  } | null;
};

function pickJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

/**
 * Page hub_feed triée ranking global (boost desc, date desc).
 */
export async function fetchHubFeedPage(opts: {
  offset?: number;
  limit?: number;
}): Promise<{ rows: HubFeedRow[]; hasMore: boolean; error?: string }> {
  const limit = opts.limit ?? 30;
  const from = Math.max(0, opts.offset ?? 0);
  const to = from + limit - 1;

  const full = await supabase
    .from('hub_feed')
    .select(
      `
      id, item_type, item_id, author_id, project_id, title, body, status, skills, media,
      boost_count, created_at,
      author:profiles!author_id(id, full_name, role, avatar_url)
    `
    )
    .order('boost_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (full.error) {
    // Sans join auteur
    const bare = await supabase
      .from('hub_feed')
      .select(
        'id, item_type, item_id, author_id, project_id, title, body, status, skills, media, boost_count, created_at'
      )
      .order('boost_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (bare.error) {
      return { rows: [], hasMore: false, error: bare.error.message };
    }
    const rows = (bare.data || []).map((r: any) => ({
      ...r,
      media: Array.isArray(r.media) ? r.media : [],
      skills: r.skills || [],
      author: null,
    })) as HubFeedRow[];
    return { rows, hasMore: rows.length >= limit };
  }

  const rows = ((full.data || []) as any[]).map((r) => ({
    ...r,
    media: Array.isArray(r.media) ? r.media : [],
    skills: r.skills || [],
    author: pickJoin(r.author),
  })) as HubFeedRow[];

  return { rows, hasMore: rows.length >= limit };
}
