/**
 * Constantes & helpers pagination / scale S0.
 * Objectif : requêtes bornées, pas de full table scan sur listes chaudes.
 */

/** Page listes Projets / Missions */
export const LIST_PAGE_SIZE = 20;

/** Page par source feed (posts / projets / missions) */
export const FEED_SOURCE_PAGE = 30;

/** Pagination UI feed (slice client sur rawItems) */
export const FEED_UI_PAGE = 12;

/**
 * Échappe une recherche pour PostgREST `ilike` / `.or()`.
 * Évite de casser le filtre si l’user tape `,` `%` `_`.
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw
    .trim()
    .replace(/[%_,]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80);
}

/** true si assez de caractères pour une recherche serveur utile */
export function isSearchActive(raw: string, min = 2): boolean {
  return sanitizeSearchTerm(raw).length >= min;
}

/**
 * Compteur aggregate PostgREST : `relation(count)` → [{ count: N }].
 * Fallback si l’embed renvoie une liste d’ids.
 */
export function embedCount(raw: unknown, fallback = 1): number {
  if (!raw) return fallback;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return 0;
    const first = raw[0] as { count?: number | string };
    if (first && typeof first === 'object' && 'count' in first) {
      const n = Number(first.count);
      return Number.isFinite(n) ? n : fallback;
    }
    return raw.length;
  }
  if (typeof raw === 'object' && raw !== null && 'count' in raw) {
    const n = Number((raw as { count: number }).count);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
