-- supabase/migrations/005_extended_fields.sql
-- Extends analyses and pain_points tables with fields required for
-- full PRD Section 7.1 compliance: app metadata, dev responsiveness,
-- and per-pain-point version tagging.

-- ── analyses table: extended app metadata ────────────────────────
ALTER TABLE analyses
    ADD COLUMN IF NOT EXISTS app_version         TEXT,
    ADD COLUMN IF NOT EXISTS contains_iap        BOOLEAN,
    ADD COLUMN IF NOT EXISTS ad_supported        BOOLEAN,
    ADD COLUMN IF NOT EXISTS total_ratings       BIGINT,
    ADD COLUMN IF NOT EXISTS total_reviews       BIGINT,
    ADD COLUMN IF NOT EXISTS dev_response_rate   FLOAT,   -- % of reviews that received a developer reply (0–100)
    ADD COLUMN IF NOT EXISTS avg_reply_time_days FLOAT;   -- average days between review date and developer reply

-- ── pain_points table: version association ───────────────────────
ALTER TABLE pain_points
    ADD COLUMN IF NOT EXISTS version_tag TEXT;            -- app version most associated with this pain point (nullable)

-- ── comments ─────────────────────────────────────────────────────
COMMENT ON COLUMN analyses.app_version         IS 'App version string at time of analysis (e.g. "9.0.12.60")';
COMMENT ON COLUMN analyses.contains_iap        IS 'Whether the app contains in-app purchases';
COMMENT ON COLUMN analyses.ad_supported        IS 'Whether the app is ad-supported';
COMMENT ON COLUMN analyses.total_ratings       IS 'Total number of ratings on Google Play';
COMMENT ON COLUMN analyses.total_reviews       IS 'Total number of written reviews on Google Play';
COMMENT ON COLUMN analyses.dev_response_rate   IS 'Percentage of scraped reviews that have a developer reply (0–100)';
COMMENT ON COLUMN analyses.avg_reply_time_days IS 'Average days taken by developer to reply to a review';
COMMENT ON COLUMN pain_points.version_tag      IS 'App version most commonly mentioned by reviewers for this pain point';
