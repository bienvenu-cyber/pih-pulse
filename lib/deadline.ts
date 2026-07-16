/**
 * Parse durée humaine FR → deadline ISO (UTC).
 * Ex. « 5 jours », « 48 h », « 2 semaines », « 1 mois », « 7 »
 */
export function parseDurationToDeadline(
  raw: string | null | undefined,
  from: Date = new Date()
): string | null {
  const s = (raw || '').trim().toLowerCase();
  if (!s) return null;

  // "48h" / "48 h" / "48 heures"
  const hours = s.match(/^(\d+)\s*h(?:eures?)?$/i) || s.match(/^(\d+)\s*heures?$/);
  if (hours) {
    const n = parseInt(hours[1], 10);
    if (n > 0 && n < 24 * 365) {
      const d = new Date(from.getTime() + n * 60 * 60 * 1000);
      return d.toISOString();
    }
  }

  // "5 jours" / "5 j" / "5j"
  const days = s.match(/^(\d+)\s*(?:j(?:ours?)?)?$/);
  if (days) {
    const n = parseInt(days[1], 10);
    if (n > 0 && n < 400) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString();
    }
  }

  // "2 semaines" / "2 sem"
  const weeks = s.match(/^(\d+)\s*(?:semaines?|sem\.?)$/);
  if (weeks) {
    const n = parseInt(weeks[1], 10);
    if (n > 0 && n < 52) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + n * 7);
      return d.toISOString();
    }
  }

  // "1 mois"
  const months = s.match(/^(\d+)\s*mois$/);
  if (months) {
    const n = parseInt(months[1], 10);
    if (n > 0 && n < 24) {
      const d = new Date(from);
      d.setUTCMonth(d.getUTCMonth() + n);
      return d.toISOString();
    }
  }

  // Fallback : premier nombre = jours
  const any = s.match(/(\d+)/);
  if (any) {
    const n = parseInt(any[1], 10);
    if (n > 0 && n < 400) {
      const d = new Date(from);
      d.setUTCDate(d.getUTCDate() + n);
      return d.toISOString();
    }
  }

  return null;
}

/** Affichage liste/détail depuis deadline */
export function formatDeadlineLabel(
  deadline: string | null | undefined,
  fallback = '—'
): string {
  if (!deadline) return fallback;
  const t = new Date(deadline).getTime();
  if (Number.isNaN(t)) return fallback;

  const now = Date.now();
  const diffMs = t - now;
  const dayMs = 24 * 60 * 60 * 1000;

  if (diffMs < -dayMs) {
    const daysAgo = Math.ceil(Math.abs(diffMs) / dayMs);
    return `Échue · ${daysAgo} j`;
  }
  if (diffMs < 0) return 'Échue aujourd’hui';

  const days = Math.ceil(diffMs / dayMs);
  if (days <= 1) return '≤ 1 jour';
  if (days < 14) return `${days} jours`;
  if (days < 60) {
    const w = Math.round(days / 7);
    return w <= 1 ? '1 semaine' : `${w} semaines`;
  }
  const months = Math.round(days / 30);
  return months <= 1 ? '1 mois' : `${months} mois`;
}

/** Date courte FR pour fiche détail */
export function formatDeadlineDate(deadline: string | null | undefined): string | null {
  if (!deadline) return null;
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
