-- Align achievements eligibility with declared match date (played_at).
-- Only matches played on/after 2026-07-19 inclusive unlock badges.

update public.matches
set achievements_eligible = (played_at::date >= date '2026-07-19');
