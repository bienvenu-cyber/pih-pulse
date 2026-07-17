/**
 * Posts hub — publications feed indépendantes des projets/missions.
 */
import { IMPACT_POINTS } from './impact';
import type { MediaAsset } from './media';
import { awardPoints } from './reputation';
import { supabase } from './supabase';

export interface CreatePostInput {
  authorId: string;
  /** Caption unique (ex-titre+corps fusionnés côté UI) */
  body: string;
  media?: MediaAsset[];
  projectId?: string | null;
}

export interface HubPost {
  id: string;
  author_id: string;
  title: string | null;
  body: string;
  media: MediaAsset[];
  project_id: string | null;
  created_at: string;
  author?: {
    id: string;
    full_name?: string | null;
    role?: string | null;
    avatar_url?: string | null;
  } | null;
  project?: {
    id: string;
    name?: string | null;
  } | null;
}

function pickJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

export async function createHubPost(
  input: CreatePostInput
): Promise<{ id?: string; error?: string }> {
  const body = input.body.trim();
  const media = input.media || [];
  if (body.length < 1 && media.length === 0) {
    return { error: 'Ajoute un message et/ou au moins un média.' };
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: input.authorId,
      // Plus de titre séparé — caption seule dans body
      title: null,
      body: body || '',
      media,
      project_id: input.projectId || null,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await awardPoints(
    input.authorId,
    IMPACT_POINTS.createPost,
    'Publication d’un post hub',
    `create_post:${data.id}`
  );

  return { id: data.id };
}

/**
 * Select résilient : si la table posts / jointures absentes,
 * on renvoie [] sans casser le feed.
 * `offset` + `limit` = pagination serveur (scale S0).
 */
export async function fetchPostsSafe(
  limit = 40,
  offset = 0
): Promise<HubPost[]> {
  const from = Math.max(0, offset);
  const to = from + Math.max(1, limit) - 1;

  const full = await supabase
    .from('posts')
    .select(
      `
      id, author_id, title, body, media, project_id, created_at,
      author:profiles!author_id(id, full_name, role, avatar_url),
      project:projects!project_id(id, name)
    `
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (!full.error && full.data) {
    return (full.data as any[]).map((row) => ({
      ...row,
      media: Array.isArray(row.media) ? row.media : [],
      author: pickJoin(row.author),
      project: pickJoin(row.project),
    }));
  }

  console.warn('[posts] full select failed, fallback:', full.error?.message);

  const basic = await supabase
    .from('posts')
    .select('id, author_id, title, body, media, project_id, created_at')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (basic.error) {
    console.warn('[posts] table unavailable:', basic.error.message);
    return [];
  }

  return (basic.data || []).map((row: any) => ({
    ...row,
    media: Array.isArray(row.media) ? row.media : [],
    author: null,
    project: null,
  }));
}

export async function fetchPostById(id: string): Promise<HubPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(
      `
      id, author_id, title, body, media, project_id, created_at,
      author:profiles!author_id(id, full_name, role, avatar_url),
      project:projects!project_id(id, name)
    `
    )
    .eq('id', id)
    .maybeSingle();

  if (error || !data) {
    console.warn('[posts] fetchById:', error?.message);
    return null;
  }

  return {
    ...(data as any),
    media: Array.isArray((data as any).media) ? (data as any).media : [],
    author: pickJoin((data as any).author),
    project: pickJoin((data as any).project),
  };
}

export interface UpdatePostInput {
  postId: string;
  authorId: string;
  body: string;
  media?: MediaAsset[];
  projectId?: string | null;
}

export async function updateHubPost(
  input: UpdatePostInput
): Promise<{ ok?: true; error?: string }> {
  const body = input.body.trim();
  const media = input.media || [];
  if (body.length < 1 && media.length === 0) {
    return { error: 'Ajoute un message et/ou au moins un média.' };
  }

  const { error } = await supabase
    .from('posts')
    .update({
      title: null,
      body: body || '',
      media,
      project_id: input.projectId || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.postId)
    .eq('author_id', input.authorId);

  if (error) return { error: error.message };
  return { ok: true };
}

/** Caption d’affichage (gère les anciens posts avec title + body) */
export function postCaption(post: { title?: string | null; body?: string | null }): string {
  const t = (post.title || '').trim();
  const b = (post.body || '').trim();
  if (t && b && !b.startsWith(t)) return `${t}\n\n${b}`;
  if (t && !b) return t;
  return b || t;
}

export async function deleteHubPost(
  postId: string,
  authorId: string
): Promise<{ ok?: true; error?: string }> {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', authorId);

  if (error) return { error: error.message };
  return { ok: true };
}
