/**
 * Réactions Élan + Boost (visibilité feed).
 * - idea / hot / ship / contribute → points créateur 1× via reaction_awards
 * - boost → 0 pts, ranking feed uniquement (icône Zap inchangée)
 */
import { notifyUser } from './activity';
import { IMPACT_POINTS, type ReactionImpactType } from './impact';
import { awardPoints } from './reputation';
import { supabase } from './supabase';

export type ReactionType = ReactionImpactType;
export type RefType = 'project' | 'mission' | 'post';

export interface ReactionCounts {
  hot: number;
  idea: number;
  ship: number;
  contribute: number;
  boosts: number;
  userReactions: ReactionType[];
  userBoosted: boolean;
}

function routeForRef(refType: RefType, refId: string): string {
  if (refType === 'project') return `/project/${refId}`;
  if (refType === 'mission') return `/mission/${refId}`;
  return `/post/${refId}`;
}

async function awardReputation(
  userId: string,
  points: number,
  reason: string,
  idempotencyKey?: string
) {
  if (points <= 0) return;
  await awardPoints(userId, points, reason, idempotencyKey);
}

async function resolveCreator(
  refId: string,
  refType: RefType
): Promise<{ creatorId: string | null; title: string }> {
  if (refType === 'project') {
    const { data } = await supabase
      .from('projects')
      .select('name, creator_id, creator:profiles!creator_id(id)')
      .eq('id', refId)
      .single();
    const creator = Array.isArray(data?.creator) ? data.creator[0] : data?.creator;
    return {
      creatorId: creator?.id ?? data?.creator_id ?? null,
      title: data?.name ? `le projet « ${data.name} »` : 'votre projet',
    };
  }
  if (refType === 'post') {
    const { data } = await supabase
      .from('posts')
      .select('title, body, author_id')
      .eq('id', refId)
      .single();
    const label =
      data?.title?.trim() ||
      (data?.body ? data.body.trim().slice(0, 40) + (data.body.length > 40 ? '…' : '') : null);
    return {
      creatorId: data?.author_id ?? null,
      title: label ? `le post « ${label} »` : 'votre post',
    };
  }
  const { data } = await supabase
    .from('missions')
    .select('title, projects(name, creator_id, creator:profiles!creator_id(id))')
    .eq('id', refId)
    .single();
  const project = Array.isArray(data?.projects) ? data.projects[0] : data?.projects;
  const creator = Array.isArray(project?.creator) ? project.creator[0] : project?.creator;
  return {
    creatorId: creator?.id ?? project?.creator_id ?? null,
    title: data?.title ? `la mission « ${data.title} »` : 'votre mission',
  };
}

/** Contribute : membre du projet OU candidature / assignation mission (ou post lié à un projet) */
async function canContribute(
  userId: string,
  refId: string,
  refType: RefType
): Promise<boolean> {
  if (refType === 'project') {
    const { data } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', refId)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  }

  if (refType === 'post') {
    const { data: post } = await supabase
      .from('posts')
      .select('project_id')
      .eq('id', refId)
      .maybeSingle();
    if (!post?.project_id) return false;
    const { data: mem } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', post.project_id)
      .eq('user_id', userId)
      .maybeSingle();
    return !!mem;
  }

  // mission: assignee, applicant, or member of parent project
  const { data: mission } = await supabase
    .from('missions')
    .select('assignee_id, project_id')
    .eq('id', refId)
    .maybeSingle();
  if (!mission) return false;
  if (mission.assignee_id === userId) return true;

  const { data: app } = await supabase
    .from('mission_applications')
    .select('id')
    .eq('mission_id', refId)
    .eq('applicant_id', userId)
    .maybeSingle();
  if (app) return true;

  if (mission.project_id) {
    const { data: mem } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', mission.project_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (mem) return true;
  }
  return false;
}

const EMPTY_COUNTS: ReactionCounts = {
  hot: 0,
  idea: 0,
  ship: 0,
  contribute: 0,
  boosts: 0,
  userReactions: [],
  userBoosted: false,
};

export function emptyReactionCounts(): ReactionCounts {
  return { ...EMPTY_COUNTS, userReactions: [] };
}

export function reactionKey(refType: RefType, refId: string): string {
  return `${refType}:${refId}`;
}

export async function fetchReactions(
  refId: string,
  refType: RefType,
  userId: string | null
): Promise<ReactionCounts> {
  // Préférer denorm + état user
  const { data: eng } = await supabase
    .from('engagement_counts')
    .select(
      'reaction_hot, reaction_idea, reaction_ship, reaction_contribute, boosts'
    )
    .eq('ref_id', refId)
    .eq('ref_type', refType)
    .maybeSingle();

  const [userReactionsRes, userBoostRes, fallbackReactions, fallbackBoosts] =
    await Promise.all([
      userId
        ? supabase
            .from('reactions')
            .select('type')
            .eq('ref_id', refId)
            .eq('ref_type', refType)
            .eq('user_id', userId)
        : Promise.resolve({ data: [] as { type: string }[] }),
      userId
        ? supabase
            .from('boosts')
            .select('id')
            .eq('ref_id', refId)
            .eq('ref_type', refType)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      eng
        ? Promise.resolve({ data: null as any })
        : supabase
            .from('reactions')
            .select('type')
            .eq('ref_id', refId)
            .eq('ref_type', refType),
      eng
        ? Promise.resolve({ count: null as number | null })
        : supabase
            .from('boosts')
            .select('id', { count: 'exact', head: true })
            .eq('ref_id', refId)
            .eq('ref_type', refType),
    ]);

  if (eng) {
    return {
      hot: eng.reaction_hot || 0,
      idea: eng.reaction_idea || 0,
      ship: eng.reaction_ship || 0,
      contribute: eng.reaction_contribute || 0,
      boosts: eng.boosts || 0,
      userReactions: (userReactionsRes.data || []).map(
        (r: any) => r.type as ReactionType
      ),
      userBoosted: !!(userBoostRes as any).data,
    };
  }

  const all = (fallbackReactions as any).data || [];
  const count = (t: string) => all.filter((r: any) => r.type === t).length;
  return {
    hot: count('hot'),
    idea: count('idea'),
    ship: count('ship'),
    contribute: count('contribute'),
    boosts: (fallbackBoosts as any).count ?? 0,
    userReactions: (userReactionsRes.data || []).map(
      (r: any) => r.type as ReactionType
    ),
    userBoosted: !!(userBoostRes as any).data,
  };
}

/**
 * Batch réactions pour listes (Feed / Projets / Missions).
 * S1 : compteurs via engagement_counts (dénormalisés) + état user en 2 req légères.
 * Fallback : agrégat rows reactions/boosts si table absente.
 */
export async function fetchReactionsBatch(
  refs: { refId: string; refType: RefType }[],
  userId: string | null
): Promise<Map<string, ReactionCounts>> {
  const map = new Map<string, ReactionCounts>();
  const unique = new Map<string, { refId: string; refType: RefType }>();
  refs.forEach((r) => {
    if (!r.refId) return;
    unique.set(reactionKey(r.refType, r.refId), r);
  });
  unique.forEach((r, key) => {
    map.set(key, emptyReactionCounts());
  });
  if (unique.size === 0) return map;

  const allIds = Array.from(
    new Set(Array.from(unique.values()).map((r) => r.refId))
  );
  const ids = allIds.length > 200 ? allIds.slice(0, 200) : allIds;
  if (allIds.length > 200) {
    console.warn('[reactions] batch capped at 200 refs');
  }

  // 1) Compteurs dénormalisés (scale)
  const { data: counts, error: countsErr } = await supabase
    .from('engagement_counts')
    .select(
      'ref_id, ref_type, reaction_hot, reaction_idea, reaction_ship, reaction_contribute, boosts'
    )
    .in('ref_id', ids);

  const usedDenorm = !countsErr && counts;
  if (usedDenorm) {
    (counts || []).forEach((row: any) => {
      const key = reactionKey(row.ref_type as RefType, row.ref_id);
      if (!map.has(key)) return;
      const c = map.get(key)!;
      c.hot = row.reaction_hot || 0;
      c.idea = row.reaction_idea || 0;
      c.ship = row.reaction_ship || 0;
      c.contribute = row.reaction_contribute || 0;
      c.boosts = row.boosts || 0;
    });
  }

  // 2) État user (mes réactions / mon boost) — rows limitées user_id
  //    + fallback full counts si denorm absente
  if (userId || !usedDenorm) {
    const queries: PromiseLike<any>[] = [];
    if (!usedDenorm) {
      queries.push(
        supabase
          .from('reactions')
          .select('ref_id, ref_type, type, user_id')
          .in('ref_id', ids)
      );
      queries.push(
        supabase
          .from('boosts')
          .select('ref_id, ref_type, user_id')
          .in('ref_id', ids)
      );
    } else if (userId) {
      queries.push(
        supabase
          .from('reactions')
          .select('ref_id, ref_type, type, user_id')
          .in('ref_id', ids)
          .eq('user_id', userId)
      );
      queries.push(
        supabase
          .from('boosts')
          .select('ref_id, ref_type, user_id')
          .in('ref_id', ids)
          .eq('user_id', userId)
      );
    }

    if (queries.length) {
      const [reactionsRes, boostsRes] = await Promise.all(queries);
      const reactions = reactionsRes?.data || [];
      const boosts = boostsRes?.data || [];

      if (!usedDenorm) {
        reactions.forEach((row: any) => {
          const key = reactionKey(row.ref_type as RefType, row.ref_id);
          if (!map.has(key)) return;
          const c = map.get(key)!;
          if (row.type === 'hot') c.hot += 1;
          else if (row.type === 'idea') c.idea += 1;
          else if (row.type === 'ship') c.ship += 1;
          else if (row.type === 'contribute') c.contribute += 1;
          if (userId && row.user_id === userId && !c.userReactions.includes(row.type)) {
            c.userReactions.push(row.type as ReactionType);
          }
        });
        boosts.forEach((row: any) => {
          const key = reactionKey(row.ref_type as RefType, row.ref_id);
          if (!map.has(key)) return;
          const c = map.get(key)!;
          c.boosts += 1;
          if (userId && row.user_id === userId) c.userBoosted = true;
        });
      } else {
        reactions.forEach((row: any) => {
          const key = reactionKey(row.ref_type as RefType, row.ref_id);
          if (!map.has(key)) return;
          const c = map.get(key)!;
          if (!c.userReactions.includes(row.type)) {
            c.userReactions.push(row.type as ReactionType);
          }
        });
        boosts.forEach((row: any) => {
          const key = reactionKey(row.ref_type as RefType, row.ref_id);
          if (!map.has(key)) return;
          map.get(key)!.userBoosted = true;
        });
      }
    }
  }

  return map;
}

/**
 * Toggle réaction. Points au créateur 1× (reaction_awards), même si un-react ensuite.
 */
export async function toggleReaction(
  refId: string,
  refType: RefType,
  type: ReactionType,
  userId: string
): Promise<'added' | 'removed' | { error: string }> {
  if (type === 'contribute') {
    const ok = await canContribute(userId, refId, refType);
    if (!ok) {
      if (refType === 'post') {
        return {
          error:
            '« Je contribue » sur un post est réservé aux membres du projet lié (si le post est rattaché).',
        };
      }
      return {
        error:
          '« Je contribue » est réservé aux membres du projet, candidats ou assignés à la mission.',
      };
    }
  }

  const { data: existing } = await supabase
    .from('reactions')
    .select('id')
    .eq('ref_id', refId)
    .eq('ref_type', refType)
    .eq('type', type)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('reactions').delete().eq('id', existing.id);
    return 'removed';
  }

  const { error: insertErr } = await supabase.from('reactions').insert({
    ref_id: refId,
    ref_type: refType,
    type,
    user_id: userId,
  });
  if (insertErr) return { error: insertErr.message };

  // Points 1× + notif créateur
  const points = IMPACT_POINTS.reaction[type] ?? 0;
  const { creatorId, title } = await resolveCreator(refId, refType);

  if (points > 0 && creatorId && creatorId !== userId) {
    const { data: already } = await supabase
      .from('reaction_awards')
      .select('id')
      .eq('user_id', userId)
      .eq('ref_id', refId)
      .eq('ref_type', refType)
      .eq('reaction_type', type)
      .maybeSingle();

    if (!already) {
      const { error: awardErr } = await supabase.from('reaction_awards').insert({
        user_id: userId,
        ref_id: refId,
        ref_type: refType,
        reaction_type: type,
        points_awarded: points,
      });
      if (!awardErr) {
        await awardReputation(
          creatorId,
          points,
          `Réaction ${type} sur ${title}`,
          `reaction:${userId}:${refType}:${refId}:${type}`
        );
      }
    }
  }

  // Notif in-app (throttlée 1×/h acteur×ref) — pas sur un-react
  if (creatorId && creatorId !== userId) {
    const labels: Record<ReactionType, string> = {
      idea: 'Bonne idée',
      hot: 'Hot',
      ship: 'Ship it',
      contribute: 'Je contribue',
    };
    try {
      await notifyUser({
        userId: creatorId,
        actorId: userId,
        type: 'reaction_received',
        title: labels[type] || 'Nouvelle réaction',
        body: `Quelqu’un a réagi « ${labels[type] || type} » sur ${title}.`,
        route: routeForRef(refType, refId),
        refId,
        refType,
        throttle: true,
      });
    } catch (e) {
      console.warn('Reaction notify failed:', e);
    }
  }

  return 'added';
}

/** Boost : 0 Élan, ranking feed uniquement — icône Zap inchangée */
export async function toggleBoost(
  refId: string,
  refType: RefType,
  userId: string
): Promise<'boosted' | 'unboosted'> {
  const { data: existing } = await supabase
    .from('boosts')
    .select('id')
    .eq('ref_id', refId)
    .eq('ref_type', refType)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase.from('boosts').delete().eq('id', existing.id);
    return 'unboosted';
  }

  await supabase.from('boosts').insert({
    ref_id: refId,
    ref_type: refType,
    user_id: userId,
  });

  // Notif créateur sans points
  try {
    const { creatorId, title } = await resolveCreator(refId, refType);
    if (creatorId && creatorId !== userId) {
      await notifyUser({
        userId: creatorId,
        actorId: userId,
        type: 'boost_received',
        title: 'Nouveau boost ⚡',
        body: `Quelqu’un a boosté ${title} dans le feed.`,
        route: routeForRef(refType, refId),
        refId,
        refType,
      });
    }
  } catch (e) {
    console.warn('Boost notify failed silently:', e);
  }

  return 'boosted';
}
