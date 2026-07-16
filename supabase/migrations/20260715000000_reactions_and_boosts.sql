-- ============================================================
-- Migration : Réactions & Boosts — PIH Pulse
-- Date : 15 Juillet 2026
-- ============================================================

-- ─── TABLE : reactions ───────────────────────────────────────
-- Stocke les réactions 🔥 Chaud et 💡 Bonne idée
-- sur les projets et missions
CREATE TABLE IF NOT EXISTS public.reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ref_id      uuid NOT NULL,                          -- id du projet ou de la mission
  ref_type    text NOT NULL CHECK (ref_type IN ('project', 'mission')),
  type        text NOT NULL CHECK (type IN ('hot', 'idea')),  -- 🔥 hot | 💡 idea
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Un user ne peut réagir qu'une seule fois par type sur un item
  UNIQUE (user_id, ref_id, ref_type, type)
);

-- Index pour récupérer rapidement les réactions d'un item
CREATE INDEX IF NOT EXISTS idx_reactions_ref ON public.reactions (ref_id, ref_type);
-- Index pour vérifier si un user a déjà réagi
CREATE INDEX IF NOT EXISTS idx_reactions_user ON public.reactions (user_id, ref_id, ref_type);

-- ─── TABLE : boosts ──────────────────────────────────────────
-- Stocke les boosts ⚡ (repost dans son feed)
-- sur les projets et missions
CREATE TABLE IF NOT EXISTS public.boosts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ref_id      uuid NOT NULL,                          -- id du projet ou de la mission
  ref_type    text NOT NULL CHECK (ref_type IN ('project', 'mission')),
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Un user ne peut booster qu'une seule fois un même item
  UNIQUE (user_id, ref_id, ref_type)
);

-- Index pour compter les boosts d'un item
CREATE INDEX IF NOT EXISTS idx_boosts_ref ON public.boosts (ref_id, ref_type);
-- Index pour vérifier si un user a déjà boosted
CREATE INDEX IF NOT EXISTS idx_boosts_user ON public.boosts (user_id, ref_id, ref_type);

-- ─── RLS : reactions ─────────────────────────────────────────
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tout le monde peut voir les réactions
CREATE POLICY "reactions_select_public"
  ON public.reactions FOR SELECT
  USING (true);

-- Insertion : uniquement pour son propre user_id
CREATE POLICY "reactions_insert_own"
  ON public.reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Suppression : uniquement ses propres réactions (toggle)
CREATE POLICY "reactions_delete_own"
  ON public.reactions FOR DELETE
  USING (auth.uid() = user_id);

-- ─── RLS : boosts ────────────────────────────────────────────
ALTER TABLE public.boosts ENABLE ROW LEVEL SECURITY;

-- Lecture publique : tout le monde peut voir les boosts
CREATE POLICY "boosts_select_public"
  ON public.boosts FOR SELECT
  USING (true);

-- Insertion : uniquement pour son propre user_id
CREATE POLICY "boosts_insert_own"
  ON public.boosts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Suppression : uniquement ses propres boosts (toggle)
CREATE POLICY "boosts_delete_own"
  ON public.boosts FOR DELETE
  USING (auth.uid() = user_id);

-- ─── COMMENTAIRES ────────────────────────────────────────────
COMMENT ON TABLE public.reactions IS 'Réactions 🔥 Chaud et 💡 Bonne idée sur projets et missions';
COMMENT ON TABLE public.boosts IS 'Boosts ⚡ — repost d''un projet/mission dans son feed, +5 pts réputation au créateur';
