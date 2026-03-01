-- supabase/migrations/006_update_pain_points_category.sql

-- Drop the old constraint
ALTER TABLE public.pain_points DROP CONSTRAINT IF EXISTS pain_points_category_check;

-- Add the new constraint including 'Monetization Friction'
ALTER TABLE public.pain_points
  ADD CONSTRAINT pain_points_category_check
  CHECK (category IN (
      'Bug',
      'UX Issue',
      'Performance',
      'Feature Gap',
      'Privacy',
      'Support',
      'Monetization Friction'
  ));
