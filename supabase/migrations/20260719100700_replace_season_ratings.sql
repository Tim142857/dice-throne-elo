-- Atomic season rating replacement with a transaction-scoped advisory lock.

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
  -- Prevent concurrent recomputes for the whole app.
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
    'playerRatings', v_player_count,
    'playerHeroRatings', v_hero_count,
    'events', v_events_count
  );
end;
$$;

revoke all on function public.replace_season_ratings(uuid, jsonb, jsonb, jsonb) from public;
grant execute on function public.replace_season_ratings(uuid, jsonb, jsonb, jsonb) to service_role;
