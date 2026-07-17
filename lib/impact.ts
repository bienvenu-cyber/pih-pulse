/**
 * Élan PIH Pulse — barème central (source de vérité produit).
 * DB: profiles.reputation_points (solde) + reputation_logs (historique).
 * UI: libellé **Élan** (ex-Impact). Constantes code gardent le préfixe IMPACT_*.
 */

/** Libellé produit unique (karma / points) */
export const ELAN_LABEL = 'Élan';

export const IMPACT_POINTS = {
  /** Réactions → créateur du projet/mission (1× par user × post × type) */
  reaction: {
    idea: 5, // 💡 Bonne idée
    hot: 8, // 🔥 Solide (type DB historique `hot`)
    ship: 12, // 🚀 Ship it
    contribute: 15, // 🛠️ Je contribue
  },
  /** Structurel */
  createProject: 25,
  createMission: 15,
  createPost: 10, // post hub / feed
  joinProject: 20,
  applicationAccepted: 20,
  missionValidationBonus: 20, // contributeur, en plus de points_reward
  leadValidatesMission: 15,
  profileComplete: 20,
  /** Transitions statut (1× par projet × statut) — toute l'équipe */
  projectStatus: {
    prototype: 40,
    mvp: 100,
    scale: 200,
  } as Record<string, number>,
  /**
   * Feedback (réponses) — pas de points sur message brut.
   * 1× par reply via reply_awards.
   */
  replyUseful: 5, // lead/auteur marque « Retour utile »
  replyPinned: 8, // première épingle
} as const;

export type ReactionImpactType = 'idea' | 'hot' | 'ship' | 'contribute';

export const REACTION_META: Record<
  ReactionImpactType,
  { label: string; points: number; description: string }
> = {
  idea: {
    label: 'Bonne idée',
    points: IMPACT_POINTS.reaction.idea,
    description: 'Idées early',
  },
  hot: {
    label: 'Solide',
    points: IMPACT_POINTS.reaction.hot,
    description: 'Qualité d’exécution',
  },
  ship: {
    label: 'Ship it',
    points: IMPACT_POINTS.reaction.ship,
    description: 'Pousser au lancement',
  },
  contribute: {
    label: 'Je contribue',
    points: IMPACT_POINTS.reaction.contribute,
    description: 'Collaboration réelle',
  },
};

export type ProfileCompleteness = {
  complete: boolean;
  /** Bonus déjà crédité (1×) */
  bonusClaimed: boolean;
  /** Afficher la CTA « complète ton profil » */
  showCta: boolean;
  /** Clés manquantes : name | bio | avatar | skills | link */
  missing: Array<'name' | 'bio' | 'avatar' | 'skills' | 'link'>;
  missingLabels: string[];
};

function normalizePortfolio(
  raw: unknown
): Record<string, string | null> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof raw === 'object') return raw as Record<string, string | null>;
  return {};
}

function normalizeSkills(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter((s) => s.trim().length > 0);
  return [];
}

/** Critères profil complet pour +20 Élan (1×) — source unique */
export function getProfileCompleteness(profile: {
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  skills?: string[] | null;
  portfolio?: Record<string, string | null> | string | null;
  impact_profile_bonus?: boolean | null;
}): ProfileCompleteness {
  const missing: ProfileCompleteness['missing'] = [];
  if ((profile.full_name || '').trim().length < 2) missing.push('name');
  if ((profile.bio || '').trim().length < 20) missing.push('bio');
  if (!(profile.avatar_url && String(profile.avatar_url).trim().length > 8)) {
    missing.push('avatar');
  }
  if (normalizeSkills(profile.skills).length < 1) missing.push('skills');
  const p = normalizePortfolio(profile.portfolio);
  const hasLink = !!(
    (p.github && String(p.github).trim()) ||
    (p.figma && String(p.figma).trim()) ||
    (p.linkedin && String(p.linkedin).trim()) ||
    (p.website && String(p.website).trim())
  );
  if (!hasLink) missing.push('link');

  const labels: Record<(typeof missing)[number], string> = {
    name: 'nom',
    bio: 'bio',
    avatar: 'photo',
    skills: 'skills',
    link: 'lien',
  };

  const complete = missing.length === 0;
  const bonusClaimed = !!profile.impact_profile_bonus;

  return {
    complete,
    bonusClaimed,
    // CTA seulement si incomplet ET bonus pas encore pris
    showCta: !complete && !bonusClaimed,
    missing,
    missingLabels: missing.map((k) => labels[k]),
  };
}

export function isProfileCompleteForBonus(profile: {
  full_name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  skills?: string[] | null;
  portfolio?: Record<string, string | null> | string | null;
}): boolean {
  return getProfileCompleteness(profile).complete;
}
