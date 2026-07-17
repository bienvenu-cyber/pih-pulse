/**
 * Système de réputation PIH Pulse — un seul axe : le niveau (points / Élan).
 * Affiché comme un badge compact sur la carte profil (pas de grille d'exploits).
 *
 * S1 : crédits via RPC `award_points` (pas d’INSERT direct client).
 */
import { supabase } from './supabase';

export type LevelId = 1 | 2 | 3 | 4 | 5;

export interface ReputationLevel {
  id: LevelId;
  /** Libellé court affiché sur la carte (badge) */
  name: string;
  emoji: string;
  minPoints: number;
  /** Points exclusifs du palier suivant (null = max) */
  maxPoints: number | null;
}

/**
 * Paliers unique source de vérité.
 * Starter → Artisan → Créateur → Innovateur → Fondateur
 */
export const REPUTATION_LEVELS: ReputationLevel[] = [
  { id: 1, name: 'Starter', emoji: '🌱', minPoints: 0, maxPoints: 199 },
  { id: 2, name: 'Artisan', emoji: '🔧', minPoints: 200, maxPoints: 599 },
  { id: 3, name: 'Créateur', emoji: '✨', minPoints: 600, maxPoints: 1199 },
  { id: 4, name: 'Innovateur', emoji: '💡', minPoints: 1200, maxPoints: 2499 },
  { id: 5, name: 'Fondateur', emoji: '👑', minPoints: 2500, maxPoints: null },
];

export interface LevelProgress {
  level: ReputationLevel;
  nextLevel: ReputationLevel | null;
  points: number;
  /** 0–100 dans le palier courant */
  progressPercent: number;
  /** Points restants avant le niveau suivant (0 si max) */
  pointsToNext: number;
}

export function getLevelForPoints(points: number): ReputationLevel {
  const safe = Math.max(0, points);
  for (let i = REPUTATION_LEVELS.length - 1; i >= 0; i--) {
    if (safe >= REPUTATION_LEVELS[i].minPoints) {
      return REPUTATION_LEVELS[i];
    }
  }
  return REPUTATION_LEVELS[0];
}

export function getLevelProgress(points: number): LevelProgress {
  const safe = Math.max(0, Math.floor(points));
  const level = getLevelForPoints(safe);
  const nextLevel =
    level.id < 5
      ? REPUTATION_LEVELS.find((l) => l.id === ((level.id + 1) as LevelId)) ?? null
      : null;

  if (!nextLevel || level.maxPoints === null) {
    return {
      level,
      nextLevel: null,
      points: safe,
      progressPercent: 100,
      pointsToNext: 0,
    };
  }

  const span = nextLevel.minPoints - level.minPoints;
  const earned = safe - level.minPoints;
  const progressPercent = Math.min(100, Math.max(0, Math.round((earned / span) * 100)));
  const pointsToNext = Math.max(0, nextLevel.minPoints - safe);

  return {
    level,
    nextLevel,
    points: safe,
    progressPercent,
    pointsToNext,
  };
}

/** Libellé badge compact : "🌱 Starter" (rétrocompat listes / équipes) */
export function formatLevelBadge(level: ReputationLevel): string {
  return `${level.emoji} ${level.name}`;
}

/** Libellé sans emoji : "Starter" (profil stamp, UI premium) */
export function formatLevelName(level: ReputationLevel): string {
  return level.name;
}

export type AwardPointsResult = {
  id?: string | null;
  error?: string;
  /** true si fallback insert (RPC pas encore déployée) */
  viaFallback?: boolean;
};

/**
 * Crédite des points (Élan) via RPC security definer.
 * @param idempotencyKey — **requis** après hardening (ex. reaction:uid:ref:type)
 */
export async function awardPoints(
  userId: string,
  points: number,
  reason: string,
  idempotencyKey?: string | null
): Promise<AwardPointsResult> {
  if (!userId || !points) return { id: null };
  const reasonSafe = String(reason || 'Action hub').slice(0, 280);
  const key = (idempotencyKey || '').trim();
  if (!key) {
    console.warn('[awardPoints] idempotency key required');
    return { error: 'idempotency_key_required' };
  }

  const { data, error } = await supabase.rpc('award_points', {
    p_user_id: userId,
    p_points: points,
    p_reason: reasonSafe,
    p_idempotency_key: key,
  });

  if (!error) {
    return { id: data as string };
  }

  const msg = error.message || '';
  const missingRpc =
    error.code === 'PGRST202' ||
    /function.*award_points|could not find/i.test(msg);

  // Fallback uniquement si RPC absente (pas si refus catalogue / rate limit)
  if (missingRpc) {
    const { data: row, error: insErr } = await supabase
      .from('reputation_logs')
      .insert({
        user_id: userId,
        points_changed: points,
        reason: reasonSafe,
      })
      .select('id')
      .single();
    if (insErr) {
      console.warn('[awardPoints] fallback insert failed:', insErr.message);
      return { error: insErr.message };
    }
    return { id: row?.id ?? null, viaFallback: true };
  }

  console.warn('[awardPoints]', msg);
  return { error: msg };
}

/** Plusieurs crédits (validation mission multi-logs, etc.) */
export async function awardPointsMany(
  awards: {
    userId: string;
    points: number;
    reason: string;
    idempotencyKey?: string | null;
  }[]
): Promise<void> {
  await Promise.all(
    awards
      .filter((a) => a.userId && a.points)
      .map((a) =>
        awardPoints(a.userId, a.points, a.reason, a.idempotencyKey)
      )
  );
}
