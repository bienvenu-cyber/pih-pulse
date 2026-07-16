/**
 * Réponses / Questions / Échanges — threads, mentions, pin, Impact feedback.
 * UI labels: post=Réponses, mission=Questions, project=Échanges
 */
import { notifyUser } from './activity';
import { IMPACT_POINTS } from './impact';
import { supabase } from './supabase';

export type ReplyRefType = 'post' | 'mission' | 'project';

export interface ReplyAuthor {
  id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  role?: string | null;
}

export interface Reply {
  id: string;
  author_id: string;
  ref_type: ReplyRefType;
  ref_id: string;
  parent_id: string | null;
  body: string;
  mention_ids: string[];
  pinned_at: string | null;
  pinned_by: string | null;
  useful_count: number;
  created_at: string;
  author?: ReplyAuthor | null;
  children?: Reply[];
  isUsefulByMe?: boolean;
}

export function replySectionTitle(refType: ReplyRefType): string {
  if (refType === 'mission') return 'Questions';
  if (refType === 'project') return 'Échanges';
  return 'Réponses';
}

export function routeForReplyRef(refType: ReplyRefType, refId: string): string {
  if (refType === 'post') return `/post/${refId}`;
  if (refType === 'mission') return `/mission/${refId}`;
  return `/project/${refId}`;
}

function pickJoin<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null;
  return Array.isArray(raw) ? raw[0] ?? null : raw;
}

/** Extrait @usernames (a-z0-9_) */
export function extractMentionUsernames(body: string): string[] {
  const re = /@([a-zA-Z0-9_]{2,30})/g;
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    found.add(m[1].toLowerCase());
  }
  return Array.from(found).slice(0, 8);
}

async function resolveMentionIds(usernames: string[]): Promise<string[]> {
  if (!usernames.length) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, username')
    .in(
      'username',
      usernames.map((u) => u.toLowerCase())
    );
  return (data || []).map((p: any) => p.id as string);
}

async function resolveRefOwner(
  refType: ReplyRefType,
  refId: string
): Promise<{ ownerId: string | null; title: string }> {
  if (refType === 'post') {
    const { data } = await supabase
      .from('posts')
      .select('author_id, title, body')
      .eq('id', refId)
      .maybeSingle();
    const label =
      data?.title?.trim() ||
      (data?.body ? String(data.body).slice(0, 40) : 'ton post');
    return { ownerId: data?.author_id ?? null, title: label };
  }
  if (refType === 'mission') {
    const { data } = await supabase
      .from('missions')
      .select('title, projects(creator_id, name)')
      .eq('id', refId)
      .maybeSingle();
    const project = pickJoin((data as any)?.projects);
    return {
      ownerId: project?.creator_id ?? null,
      title: data?.title || 'ta mission',
    };
  }
  const { data } = await supabase
    .from('projects')
    .select('creator_id, name')
    .eq('id', refId)
    .maybeSingle();
  return { ownerId: data?.creator_id ?? null, title: data?.name || 'ton projet' };
}

/** Lead projet ou créateur de la ref peut pinner / marquer utile */
export async function canModerateRef(
  userId: string,
  refType: ReplyRefType,
  refId: string
): Promise<boolean> {
  if (refType === 'post') {
    const { data } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', refId)
      .maybeSingle();
    return data?.author_id === userId;
  }

  let projectId: string | null = null;
  if (refType === 'project') {
    projectId = refId;
  } else {
    const { data } = await supabase
      .from('missions')
      .select('project_id')
      .eq('id', refId)
      .maybeSingle();
    projectId = data?.project_id ?? null;
  }
  if (!projectId) return false;

  const { data: project } = await supabase
    .from('projects')
    .select('creator_id')
    .eq('id', projectId)
    .maybeSingle();
  if (project?.creator_id === userId) return true;

  const { data: mem } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();
  const role = (mem?.role || '').toLowerCase();
  return role.includes('founder') || role.includes('lead') || role.includes('creator');
}

export async function fetchReplies(
  refType: ReplyRefType,
  refId: string,
  userId?: string | null
): Promise<Reply[]> {
  const { data, error } = await supabase
    .from('replies')
    .select(
      `
      id, author_id, ref_type, ref_id, parent_id, body, mention_ids,
      pinned_at, pinned_by, useful_count, created_at,
      author:profiles!author_id(id, full_name, username, avatar_url, role)
    `
    )
    .eq('ref_type', refType)
    .eq('ref_id', refId)
    .order('created_at', { ascending: true })
    .limit(200);

  if (error) {
    console.warn('[replies] fetch:', error.message);
    return [];
  }

  let usefulSet = new Set<string>();
  if (userId && data?.length) {
    const ids = data.map((r: any) => r.id);
    const { data: awards } = await supabase
      .from('reply_awards')
      .select('reply_id')
      .eq('awarder_id', userId)
      .eq('award_type', 'useful')
      .in('reply_id', ids);
    usefulSet = new Set((awards || []).map((a: any) => a.reply_id));
  }

  const flat: Reply[] = (data || []).map((row: any) => ({
    ...row,
    mention_ids: row.mention_ids || [],
    author: pickJoin(row.author),
    isUsefulByMe: usefulSet.has(row.id),
    children: [],
  }));

  const byId = new Map<string, Reply>();
  flat.forEach((r) => byId.set(r.id, r));
  const roots: Reply[] = [];

  flat.forEach((r) => {
    if (r.parent_id && byId.has(r.parent_id)) {
      const parent = byId.get(r.parent_id)!;
      parent.children = parent.children || [];
      parent.children.push(r);
    } else if (!r.parent_id) {
      roots.push(r);
    }
  });

  // Pins first, then chronological
  roots.sort((a, b) => {
    if (a.pinned_at && !b.pinned_at) return -1;
    if (!a.pinned_at && b.pinned_at) return 1;
    if (a.pinned_at && b.pinned_at) {
      return new Date(b.pinned_at).getTime() - new Date(a.pinned_at).getTime();
    }
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return roots;
}

export async function createReply(input: {
  authorId: string;
  refType: ReplyRefType;
  refId: string;
  body: string;
  parentId?: string | null;
}): Promise<{ id?: string; error?: string }> {
  const body = input.body.trim();
  if (body.length < 1) return { error: 'Écris un message.' };
  if (body.length > 2000) return { error: 'Message trop long (max 2000).' };

  // Max 2 niveaux : parent ne peut pas avoir de parent
  if (input.parentId) {
    const { data: parent } = await supabase
      .from('replies')
      .select('id, parent_id, ref_type, ref_id')
      .eq('id', input.parentId)
      .maybeSingle();
    if (!parent) return { error: 'Fil introuvable.' };
    if (parent.parent_id) {
      return { error: 'Les fils sont limités à 2 niveaux.' };
    }
    if (parent.ref_type !== input.refType || parent.ref_id !== input.refId) {
      return { error: 'Réponse hors contexte.' };
    }
  }

  const usernames = extractMentionUsernames(body);
  const mentionIds = await resolveMentionIds(usernames);

  const { data, error } = await supabase
    .from('replies')
    .insert({
      author_id: input.authorId,
      ref_type: input.refType,
      ref_id: input.refId,
      parent_id: input.parentId || null,
      body,
      mention_ids: mentionIds,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };

  const route = routeForReplyRef(input.refType, input.refId);
  const preview = body.length > 80 ? body.slice(0, 80) + '…' : body;

  // Notif owner du contenu (si pas soi-même)
  try {
    const { ownerId, title } = await resolveRefOwner(input.refType, input.refId);
    if (ownerId && ownerId !== input.authorId) {
      await notifyUser({
        userId: ownerId,
        actorId: input.authorId,
        type: 'reply_received',
        title: input.refType === 'mission' ? 'Nouvelle question' : 'Nouvelle réponse',
        body: `Sur « ${title} » : ${preview}`,
        route,
        refId: input.refId,
        refType: input.refType,
      });
    }
  } catch (e) {
    console.warn('reply owner notify', e);
  }

  // Mentions
  for (const mid of mentionIds) {
    if (mid === input.authorId) continue;
    try {
      await notifyUser({
        userId: mid,
        actorId: input.authorId,
        type: 'reply_mention',
        title: 'Tu as été mentionné',
        body: preview,
        route,
        refId: input.refId,
        refType: input.refType,
      });
    } catch {
      /* ignore */
    }
  }

  // Parent author notif (thread)
  if (input.parentId) {
    const { data: parent } = await supabase
      .from('replies')
      .select('author_id')
      .eq('id', input.parentId)
      .maybeSingle();
    if (parent?.author_id && parent.author_id !== input.authorId) {
      await notifyUser({
        userId: parent.author_id,
        actorId: input.authorId,
        type: 'reply_received',
        title: 'Réponse à ton fil',
        body: preview,
        route,
        refId: input.refId,
        refType: input.refType,
      });
    }
  }

  return { id: data.id };
}

export async function deleteReply(
  replyId: string,
  userId: string
): Promise<{ ok?: true; error?: string }> {
  const { error } = await supabase
    .from('replies')
    .delete()
    .eq('id', replyId)
    .eq('author_id', userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function pinReply(input: {
  replyId: string;
  userId: string;
  pin: boolean;
}): Promise<{ ok?: true; error?: string; pointsGranted?: number }> {
  const { data: reply } = await supabase
    .from('replies')
    .select('id, author_id, ref_type, ref_id, parent_id, pinned_at, body')
    .eq('id', input.replyId)
    .maybeSingle();
  if (!reply) return { error: 'Réponse introuvable.' };
  if ((reply as any).parent_id) {
    return { error: 'Seules les réponses racines peuvent être épinglées.' };
  }

  const allowed = await canModerateRef(
    input.userId,
    reply.ref_type as ReplyRefType,
    reply.ref_id
  );
  if (!allowed) return { error: 'Seul l’auteur ou un lead peut épingler.' };

  if (input.pin) {
    // Un seul pin par ref : clear others
    await supabase
      .from('replies')
      .update({ pinned_at: null, pinned_by: null })
      .eq('ref_type', reply.ref_type)
      .eq('ref_id', reply.ref_id)
      .not('pinned_at', 'is', null);

    const { error } = await supabase
      .from('replies')
      .update({
        pinned_at: new Date().toISOString(),
        pinned_by: input.userId,
      })
      .eq('id', input.replyId);
    if (error) return { error: error.message };

    // Points 1×
    let pointsGranted = 0;
    if (reply.author_id !== input.userId) {
      const { data: already } = await supabase
        .from('reply_awards')
        .select('id')
        .eq('reply_id', input.replyId)
        .eq('award_type', 'pinned')
        .maybeSingle();
      if (!already) {
        const pts = IMPACT_POINTS.replyPinned;
        const { error: aerr } = await supabase.from('reply_awards').insert({
          reply_id: input.replyId,
          awarder_id: input.userId,
          award_type: 'pinned',
          points_awarded: pts,
        });
        if (!aerr) {
          await supabase.from('reputation_logs').insert({
            user_id: reply.author_id,
            points_changed: pts,
            reason: 'Réponse épinglée',
          });
          pointsGranted = pts;
          await notifyUser({
            userId: reply.author_id,
            actorId: input.userId,
            type: 'reply_pinned',
            title: `Réponse épinglée · +${pts} Impact`,
            body: (reply.body || '').slice(0, 80),
            route: routeForReplyRef(reply.ref_type as ReplyRefType, reply.ref_id),
            refId: reply.ref_id,
            refType: reply.ref_type as ReplyRefType,
          });
        }
      }
    }
    return { ok: true, pointsGranted };
  }

  const { error } = await supabase
    .from('replies')
    .update({ pinned_at: null, pinned_by: null })
    .eq('id', input.replyId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function markReplyUseful(input: {
  replyId: string;
  userId: string;
}): Promise<{ ok?: true; error?: string; pointsGranted?: number }> {
  const { data: reply } = await supabase
    .from('replies')
    .select('id, author_id, ref_type, ref_id, body, useful_count')
    .eq('id', input.replyId)
    .maybeSingle();
  if (!reply) return { error: 'Réponse introuvable.' };
  if (reply.author_id === input.userId) {
    return { error: 'Tu ne peux pas marquer ta propre réponse comme utile.' };
  }

  const allowed = await canModerateRef(
    input.userId,
    reply.ref_type as ReplyRefType,
    reply.ref_id
  );
  if (!allowed) {
    return { error: 'Seul l’auteur du contenu ou un lead peut marquer « utile ».' };
  }

  const { data: already } = await supabase
    .from('reply_awards')
    .select('id')
    .eq('reply_id', input.replyId)
    .eq('award_type', 'useful')
    .maybeSingle();
  if (already) return { error: 'Déjà marquée utile.' };

  const pts = IMPACT_POINTS.replyUseful;
  const { error: aerr } = await supabase.from('reply_awards').insert({
    reply_id: input.replyId,
    awarder_id: input.userId,
    award_type: 'useful',
    points_awarded: pts,
  });
  if (aerr) return { error: aerr.message };

  await supabase
    .from('replies')
    .update({ useful_count: (reply.useful_count || 0) + 1 })
    .eq('id', input.replyId);

  await supabase.from('reputation_logs').insert({
    user_id: reply.author_id,
    points_changed: pts,
    reason: 'Retour utile sur une réponse',
  });

  await notifyUser({
    userId: reply.author_id,
    actorId: input.userId,
    type: 'reply_useful',
    title: `Retour utile · +${pts} Impact`,
    body: (reply.body || '').slice(0, 80),
    route: routeForReplyRef(reply.ref_type as ReplyRefType, reply.ref_id),
    refId: reply.ref_id,
    refType: reply.ref_type as ReplyRefType,
  });

  return { ok: true, pointsGranted: pts };
}

/**
 * Compteurs batch pour cartes feed/listes.
 * Clé map: `${refType}:${refId}`
 */
export async function fetchReplyCounts(
  groups: { refType: ReplyRefType; ids: string[] }[]
): Promise<Map<string, number>> {
  const map = new Map<string, number>();
  await Promise.all(
    groups.map(async ({ refType, ids }) => {
      const unique = [...new Set(ids.filter(Boolean))];
      if (!unique.length) return;
      const { data, error } = await supabase
        .from('replies')
        .select('ref_id')
        .eq('ref_type', refType)
        .in('ref_id', unique);
      if (error) {
        console.warn('[replies] counts:', error.message);
        return;
      }
      (data || []).forEach((row: any) => {
        const key = `${refType}:${row.ref_id}`;
        map.set(key, (map.get(key) || 0) + 1);
      });
    })
  );
  return map;
}

/** Suggestions @ pour autocomplete */
export async function searchMentionProfiles(
  query: string,
  limit = 6
): Promise<{ id: string; username: string; full_name: string | null }[]> {
  const q = query.replace(/^@/, '').trim();
  if (q.length < 1) return [];
  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .not('username', 'is', null)
    .ilike('username', `${q}%`)
    .limit(limit);
  return (data || []).filter((p: any) => p.username) as any;
}
