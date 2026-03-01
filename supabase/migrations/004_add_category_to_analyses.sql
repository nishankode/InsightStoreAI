-- ═══════════════════════════════════════════════════════════════════
-- InsightStore AI — Migration 004: Add app_category to analyses
-- Run this in: Supabase Dashboard → SQL Editor
-- Run AFTER 001_initial_schema.sql
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS app_category TEXT;

COMMENT ON COLUMN public.analyses.app_category
  IS 'Google Play genre/category of the analysed app (e.g. "Music & Audio").';
