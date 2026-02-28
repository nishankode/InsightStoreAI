-- ═══════════════════════════════════════════════════════════════════
-- InsightStore AI — Migration 002: Row Level Security Policies
-- Run this in: Supabase Dashboard → SQL Editor
-- Run AFTER 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════
-- STEP 1: Enable RLS on all tables
-- ══════════════════════════════════════════════════════════════════
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pain_points   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cache  ENABLE ROW LEVEL SECURITY;


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.users
-- ══════════════════════════════════════════════════════════════════

-- Users can read their own profile row only
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users can update their own row (e.g. analysis_count)
-- plan column is updated only by service_role (Stripe webhook, future)
CREATE POLICY "users_update_own"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.analyses
-- ══════════════════════════════════════════════════════════════════

-- 1. Authenticated users see only their own analyses
CREATE POLICY "analyses_select_own"
  ON public.analyses
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 2. Anyone (anon) can read analyses where is_public = true
--    This powers shareable read-only report links (assumption A5 fix)
CREATE POLICY "analyses_select_public_share"
  ON public.analyses
  FOR SELECT
  TO anon
  USING (is_public = true);

-- 3. Free-tier insert limit: max 5 analyses per user.
--    Builder/Pro/Agency plans have no limit.
--    This is the database-layer enforcement — cannot be bypassed client-side.
CREATE POLICY "analyses_insert_free_tier_limit"
  ON public.analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      -- Non-free plans: always allowed
      (SELECT plan FROM public.users WHERE id = auth.uid()) != 'free'
    )
    OR
    (
      -- Free plan: allow only if < 5 analyses exist for this user
      (SELECT COUNT(*) FROM public.analyses WHERE user_id = auth.uid()) < 5
    )
  );

-- 4. Authenticated users can update their own analyses
--    (e.g. Edge Function updating status, review_counts, is_public)
--    Note: Edge Functions use service_role key and bypass RLS entirely,
--    but this policy protects against accidental client-side mutations.
CREATE POLICY "analyses_update_own"
  ON public.analyses
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. Authenticated users can delete their own analyses
CREATE POLICY "analyses_delete_own"
  ON public.analyses
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.pain_points
-- ══════════════════════════════════════════════════════════════════

-- 1. Authenticated users can read pain_points for analyses they own
CREATE POLICY "pain_points_select_own"
  ON public.pain_points
  FOR SELECT
  TO authenticated
  USING (
    analysis_id IN (
      SELECT id FROM public.analyses WHERE user_id = auth.uid()
    )
  );

-- 2. Anyone (anon) can read pain_points for public analyses
CREATE POLICY "pain_points_select_public_share"
  ON public.pain_points
  FOR SELECT
  TO anon
  USING (
    analysis_id IN (
      SELECT id FROM public.analyses WHERE is_public = true
    )
  );

-- 3. No direct client INSERT into pain_points.
--    Inserts happen exclusively via Edge Functions (service_role).
--    This policy intentionally does NOT exist — no INSERT allowed for authenticated/anon.


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.review_cache
-- ══════════════════════════════════════════════════════════════════
-- review_cache is INTERNAL ONLY.
-- Only the Edge Functions (running as service_role) read/write it.
-- service_role bypasses RLS, so no policy is needed for it.
-- We explicitly deny all access to authenticated and anon roles.

CREATE POLICY "review_cache_deny_all_client"
  ON public.review_cache
  FOR ALL
  TO authenticated, anon
  USING (false)
  WITH CHECK (false);
