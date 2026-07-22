-- Support draw matches (match nul): nullable winner, Elo actual_score 0.5, draws_count.

alter table public.match_proposals
  alter column winner_profile_id drop not null;

alter table public.match_proposals
  drop constraint match_proposals_winner_is_participant;

alter table public.match_proposals
  add constraint match_proposals_winner_is_participant check (
    winner_profile_id is null
    or winner_profile_id = player1_id
    or winner_profile_id = player2_id
  );

alter table public.rating_events
  drop constraint rating_events_actual_score_binary;

alter table public.rating_events
  add constraint rating_events_actual_score_values check (
    actual_score in (0, 0.5, 1)
  );

alter table public.player_ratings
  add column draws_count integer not null default 0;

alter table public.player_ratings
  drop constraint player_ratings_counts_valid;

alter table public.player_ratings
  add constraint player_ratings_counts_valid check (
    matches_count >= 0
    and wins_count >= 0
    and losses_count >= 0
    and draws_count >= 0
    and wins_count + losses_count + draws_count = matches_count
  );

alter table public.player_hero_ratings
  add column draws_count integer not null default 0;

alter table public.player_hero_ratings
  drop constraint player_hero_ratings_counts_valid;

alter table public.player_hero_ratings
  add constraint player_hero_ratings_counts_valid check (
    matches_count >= 0
    and wins_count >= 0
    and losses_count >= 0
    and draws_count >= 0
    and wins_count + losses_count + draws_count = matches_count
  );

create or replace function public.replace_season_ratings(
  p_season_id uuid,
  p_events jsonb,
  p_player_ratings jsonb,
  p_player_hero_ratings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_events_count integer := 0;
  v_player_count integer := 0;
  v_hero_count integer := 0;
begin
  perform pg_advisory_xact_lock(hashtext('dice_throne_elo_recompute'));

  delete from public.rating_events
  where season_id = p_season_id;

  delete from public.player_hero_ratings
  where season_id = p_season_id;

  delete from public.player_ratings
  where season_id = p_season_id;

  insert into public.player_ratings (
    profile_id,
    season_id,
    rating,
    matches_count,
    wins_count,
    losses_count,
    draws_count,
    current_streak,
    best_rating,
    worst_rating,
    last_validated_match_at
  )
  select
    (item->>'profileId')::uuid,
    p_season_id,
    (item->>'rating')::numeric,
    (item->>'matchesCount')::integer,
    (item->>'winsCount')::integer,
    (item->>'lossesCount')::integer,
    coalesce((item->>'drawsCount')::integer, 0),
    (item->>'currentStreak')::integer,
    (item->>'bestRating')::numeric,
    nullif(item->>'worstRating', '')::numeric,
    nullif(item->>'lastValidatedMatchAt', '')::timestamptz
  from jsonb_array_elements(p_player_ratings) as item;

  get diagnostics v_player_count = row_count;

  insert into public.player_hero_ratings (
    profile_id,
    hero_id,
    season_id,
    rating,
    matches_count,
    wins_count,
    losses_count,
    draws_count,
    last_used_at
  )
  select
    (item->>'profileId')::uuid,
    (item->>'heroId')::uuid,
    p_season_id,
    (item->>'rating')::numeric,
    (item->>'matchesCount')::integer,
    (item->>'winsCount')::integer,
    (item->>'lossesCount')::integer,
    coalesce((item->>'drawsCount')::integer, 0),
    nullif(item->>'lastUsedAt', '')::timestamptz
  from jsonb_array_elements(p_player_hero_ratings) as item;

  get diagnostics v_hero_count = row_count;

  insert into public.rating_events (
    match_id,
    season_id,
    profile_id,
    hero_id,
    rating_type,
    rating_before,
    expected_score,
    actual_score,
    rating_change,
    rating_after,
    processed_at
  )
  select
    (item->>'matchId')::uuid,
    p_season_id,
    (item->>'profileId')::uuid,
    nullif(item->>'heroId', '')::uuid,
    (item->>'ratingType')::public.rating_type,
    (item->>'ratingBefore')::numeric,
    (item->>'expectedScore')::numeric,
    (item->>'actualScore')::numeric,
    (item->>'ratingChange')::numeric,
    (item->>'ratingAfter')::numeric,
    (item->>'processedAt')::timestamptz
  from jsonb_array_elements(p_events) as item;

  get diagnostics v_events_count = row_count;

  return jsonb_build_object(
    'eventsCount', v_events_count,
    'playerCount', v_player_count,
    'heroCount', v_hero_count
  );
end;
$$;
