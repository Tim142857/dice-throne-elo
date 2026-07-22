-- Allow 0-0 draws: remaining health alone defines the outcome (equal = draw).

alter table public.match_proposals
  drop constraint if exists match_proposals_final_health_not_both_zero;
