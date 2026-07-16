/**
 * Système de réputation PIH Pulse — un seul axe : le niveau (points).
 * Affiché comme un badge compact sur la carte profil (pas de grille d'exploits).
 */

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
