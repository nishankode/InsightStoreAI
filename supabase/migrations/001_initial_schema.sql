-- ═══════════════════════════════════════════════════════════════════
-- InsightStore AI — Migration 001: Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── Enable required extensions ────────────────────────────────────
-- pg_cron: scheduled jobs (auto-purge review cache every hour)
-- Note: pg_cron must be enabled in Supabase Dashboard →
--       Database → Extensions before this line will work.
CREATE EXTENSION IF NOT EXISTS pg_cron;


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.users
-- Extends auth.users with plan and analysis count.
-- Row is auto-created by a trigger (migration 003) on sign-up.
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL DEFAULT 'free'
                              CHECK (plan IN ('free', 'builder', 'pro', 'agency')),
  analysis_count  INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.users              IS 'App-level user profile, extends Supabase Auth.';
COMMENT ON COLUMN public.users.plan         IS 'Subscription tier: free | builder | pro | agency.';
COMMENT ON COLUMN public.users.analysis_count IS 'Lifetime count of analyses run by this user.';


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.analyses
-- One row per analysis run. Tracks status, app metadata, and
-- the shared_token used for public read-only report links.
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.analyses (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        REFERENCES public.users(id) ON DELETE CASCADE,
  app_id        TEXT        NOT NULL,
  app_name      TEXT,
  app_icon_url  TEXT,
  app_rating    NUMERIC(3,1),
  app_installs  TEXT,
  -- review_counts: stores per-tier count so star chart survives 24-hr cache purge
  -- e.g. { "1": 94, "2": 88, "3": 100 }
  review_counts JSONB       NOT NULL DEFAULT '{}',
  status        TEXT        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','scraping','analysing','complete','error')),
  -- is_public: true = shareable via shared_token link (assumption A5 from dev tasks)
  is_public     BOOLEAN     NOT NULL DEFAULT false,
  shared_token  UUID        NOT NULL DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyses_user_id     ON public.analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_shared_token ON public.analyses(shared_token);
CREATE INDEX IF NOT EXISTS idx_analyses_app_id       ON public.analyses(app_id);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at   ON public.analyses(created_at DESC);

COMMENT ON TABLE  public.analyses               IS 'One row per analysis session.';
COMMENT ON COLUMN public.analyses.app_id        IS 'Google Play package ID, e.g. com.spotify.music.';
COMMENT ON COLUMN public.analyses.review_counts IS 'Cached per-star-tier review counts (survives review_cache purge).';
COMMENT ON COLUMN public.analyses.status        IS 'Pipeline state: pending→scraping→analysing→complete|error.';
COMMENT ON COLUMN public.analyses.is_public     IS 'If true, shared_token grants anonymous read access.';
COMMENT ON COLUMN public.analyses.shared_token  IS 'UUID token for shareable read-only report links.';


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.pain_points
-- Extracted pain points per analysis. Mirrors PRD Section 10.2
-- JSON schema exactly — stored relationally for efficient querying.
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.pain_points (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id             UUID        NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  category                TEXT        NOT NULL
                                      CHECK (category IN (
                                        'Bug', 'UX Issue', 'Performance',
                                        'Feature Gap', 'Privacy', 'Support'
                                      )),
  severity                TEXT        NOT NULL
                                      CHECK (severity IN ('High', 'Medium', 'Low')),
  frequency               INT         NOT NULL CHECK (frequency >= 0),
  description             TEXT        NOT NULL,
  -- Array of verbatim user review quotes (max 2 per design)
  representative_quotes   JSONB       NOT NULL DEFAULT '[]',
  -- { recommendation, phase, effort, impact } — full improvement object
  improvement             JSONB       NOT NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pain_points_analysis_id ON public.pain_points(analysis_id);
CREATE INDEX IF NOT EXISTS idx_pain_points_severity    ON public.pain_points(severity);
CREATE INDEX IF NOT EXISTS idx_pain_points_category    ON public.pain_points(category);

COMMENT ON TABLE  public.pain_points                       IS 'AI-extracted pain points from PRD Section 10.2 schema.';
COMMENT ON COLUMN public.pain_points.representative_quotes IS 'JSONB array of verbatim review strings (max 2).';
COMMENT ON COLUMN public.pain_points.improvement           IS 'JSONB: { recommendation, phase, effort, impact }.';


-- ══════════════════════════════════════════════════════════════════
-- TABLE: public.review_cache
-- Temporary 24-hour cache of raw scraped reviews per app/tier.
-- Eliminates redundant scraping. Auto-purged every hour by pg_cron.
-- UNIQUE(app_id, star_tier) enforces one cache entry per tier.
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.review_cache (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      TEXT        NOT NULL,
  star_tier   INT         NOT NULL CHECK (star_tier IN (1, 2, 3)),
  -- Array of { text, score, date, thumbsUpCount, userName }
  reviews     JSONB       NOT NULL DEFAULT '[]',
  cached_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  uq_review_cache_app_tier UNIQUE (app_id, star_tier)
);

CREATE INDEX IF NOT EXISTS idx_review_cache_app_star  ON public.review_cache(app_id, star_tier);
CREATE INDEX IF NOT EXISTS idx_review_cache_cached_at ON public.review_cache(cached_at);

COMMENT ON TABLE  public.review_cache           IS '24-hour cache of scraped reviews. Purged hourly by pg_cron.';
COMMENT ON COLUMN public.review_cache.star_tier IS 'Star rating tier: 1 | 2 | 3.';
COMMENT ON COLUMN public.review_cache.reviews   IS 'JSONB array of { text, score, date, thumbsUpCount, userName }.';


-- ══════════════════════════════════════════════════════════════════
-- pg_cron: Auto-purge review_cache entries older than 24 hours.
-- Runs every hour on the hour.
-- ══════════════════════════════════════════════════════════════════
SELECT cron.schedule(
  'purge-review-cache',           -- job name (idempotent)
  '0 * * * *',                   -- every hour at :00
  $$
    DELETE FROM public.review_cache
    WHERE cached_at < NOW() - INTERVAL '24 hours';
  $$
);
