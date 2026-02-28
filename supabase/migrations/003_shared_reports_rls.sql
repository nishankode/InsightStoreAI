-- ═══════════════════════════════════════════════════════════════════
-- InsightStore AI — Migration 003: Shared Reports (TASK-15)
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════
-- Fix for a logic flaw in Migration 002:
-- The original 'public_share' policies were granted 'TO anon' only.
-- This meant unauthenticated users could view public reports, but
-- AUTHENTICATED users viewing SOMEONE ELSE's public report were denied!
-- 'TO public' applies to all postgres roles (anon + authenticated).

-- 1. Update public Analyses policy
DROP POLICY IF EXISTS "analyses_select_public_share" ON public.analyses;
CREATE POLICY "analyses_select_public_share"
  ON public.analyses
  FOR SELECT
  TO public
  USING (is_public = true);

-- 2. Update public Pain Points policy
DROP POLICY IF EXISTS "pain_points_select_public_share" ON public.pain_points;
CREATE POLICY "pain_points_select_public_share"
  ON public.pain_points
  FOR SELECT
  TO public
  USING (
    analysis_id IN (
      SELECT id FROM public.analyses WHERE is_public = true
    )
  );
