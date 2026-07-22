import {
  applyGeneralElo,
  applyPlayerHeroElo,
  nextWinStreak,
  updateBestAndWorstRatings,
} from "@/domain/elo/calculate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SEED_IDS } from "@/types/database";
import type { MatchProposalRow } from "@/types/database";

type RatingRow = {
  profile_id: string;
  season_id: string;
  rating: string | number;
  matches_count: number;
  wins_count: number;
  losses_count: number;
  draws_count?: number;
  current_streak: number;
  best_rating: string | number;
  worst_rating: string | number | null;
};

type HeroRatingRow = {
  profile_id: string;
  hero_id: string;
  season_id: string;
  rating: string | number;
  matches_count: number;
  wins_count: number;
  losses_count: number;
  draws_count?: number;
};

function toNumber(pValue: string | number | null | undefined): number {
  if (pValue === null || pValue === undefined) {
    return 1000;
  }
  return typeof pValue === "number" ? pValue : Number(pValue);
}

async function getOrCreatePlayerRating(pProfileId: string): Promise<RatingRow> {
  const admin = createSupabaseAdminClient();
  const existing = await admin
    .from("player_ratings")
    .select("*")
    .eq("profile_id", pProfileId)
    .eq("season_id", SEED_IDS.globalSeasonId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data) {
    return existing.data as RatingRow;
  }

  const inserted = await admin
    .from("player_ratings")
    .insert({
      profile_id: pProfileId,
      season_id: SEED_IDS.globalSeasonId,
      rating: 1000,
      best_rating: 1000,
    })
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? "Impossible de créer le rating joueur.");
  }
  return inserted.data as RatingRow;
}

async function getOrCreatePlayerHeroRating(
  pProfileId: string,
  pHeroId: string,
): Promise<HeroRatingRow> {
  const admin = createSupabaseAdminClient();
  const existing = await admin
    .from("player_hero_ratings")
    .select("*")
    .eq("profile_id", pProfileId)
    .eq("hero_id", pHeroId)
    .eq("season_id", SEED_IDS.globalSeasonId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(existing.error.message);
  }
  if (existing.data) {
    return existing.data as HeroRatingRow;
  }

  const inserted = await admin
    .from("player_hero_ratings")
    .insert({
      profile_id: pProfileId,
      hero_id: pHeroId,
      season_id: SEED_IDS.globalSeasonId,
      rating: 1000,
    })
    .select("*")
    .single();

  if (inserted.error || !inserted.data) {
    throw new Error(inserted.error?.message ?? "Impossible de créer le rating joueur–héros.");
  }
  return inserted.data as HeroRatingRow;
}

/**
 * Apply general + player-hero Elo for a newly validated match.
 * Must only be called once per validated match.
 */
export async function applyEloForValidatedMatch(pInput: {
  matchId: string;
  proposal: MatchProposalRow;
  processedAt: string;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const existingEvents = await admin
    .from("rating_events")
    .select("id")
    .eq("match_id", pInput.matchId)
    .limit(1);

  if (existingEvents.error) {
    throw new Error(existingEvents.error.message);
  }
  if ((existingEvents.data?.length ?? 0) > 0) {
    return;
  }

  const isDraw = pInput.proposal.winnerProfileId === null;
  const winnerIsPlayer1 = isDraw
    ? null
    : pInput.proposal.winnerProfileId === pInput.proposal.player1Id;

  const [rating1, rating2, heroRating1, heroRating2] = await Promise.all([
    getOrCreatePlayerRating(pInput.proposal.player1Id),
    getOrCreatePlayerRating(pInput.proposal.player2Id),
    getOrCreatePlayerHeroRating(pInput.proposal.player1Id, pInput.proposal.hero1Id),
    getOrCreatePlayerHeroRating(pInput.proposal.player2Id, pInput.proposal.hero2Id),
  ]);

  const general = applyGeneralElo({
    ratingA: toNumber(rating1.rating),
    ratingB: toNumber(rating2.rating),
    winnerIsA: winnerIsPlayer1,
  });
  const playerHero = applyPlayerHeroElo({
    ratingA: toNumber(heroRating1.rating),
    ratingB: toNumber(heroRating2.rating),
    winnerIsA: winnerIsPlayer1,
  });

  const extremes1 = updateBestAndWorstRatings({
    previousBest: toNumber(rating1.best_rating),
    previousWorst: rating1.worst_rating === null ? null : toNumber(rating1.worst_rating),
    newRating: general.playerA.ratingAfter,
    matchesCountBefore: rating1.matches_count,
  });
  const extremes2 = updateBestAndWorstRatings({
    previousBest: toNumber(rating2.best_rating),
    previousWorst: rating2.worst_rating === null ? null : toNumber(rating2.worst_rating),
    newRating: general.playerB.ratingAfter,
    matchesCountBefore: rating2.matches_count,
  });

  const streak1 = nextWinStreak(rating1.current_streak, winnerIsPlayer1 === true);
  const streak2 = nextWinStreak(rating2.current_streak, winnerIsPlayer1 === false);

  const { error: eventsError } = await admin.from("rating_events").insert([
    {
      match_id: pInput.matchId,
      season_id: SEED_IDS.globalSeasonId,
      profile_id: pInput.proposal.player1Id,
      hero_id: null,
      rating_type: "general",
      rating_before: general.playerA.ratingBefore,
      expected_score: general.playerA.expectedScore,
      actual_score: general.playerA.actualScore,
      rating_change: general.playerA.ratingChange,
      rating_after: general.playerA.ratingAfter,
      processed_at: pInput.processedAt,
    },
    {
      match_id: pInput.matchId,
      season_id: SEED_IDS.globalSeasonId,
      profile_id: pInput.proposal.player2Id,
      hero_id: null,
      rating_type: "general",
      rating_before: general.playerB.ratingBefore,
      expected_score: general.playerB.expectedScore,
      actual_score: general.playerB.actualScore,
      rating_change: general.playerB.ratingChange,
      rating_after: general.playerB.ratingAfter,
      processed_at: pInput.processedAt,
    },
    {
      match_id: pInput.matchId,
      season_id: SEED_IDS.globalSeasonId,
      profile_id: pInput.proposal.player1Id,
      hero_id: pInput.proposal.hero1Id,
      rating_type: "playerHero",
      rating_before: playerHero.playerA.ratingBefore,
      expected_score: playerHero.playerA.expectedScore,
      actual_score: playerHero.playerA.actualScore,
      rating_change: playerHero.playerA.ratingChange,
      rating_after: playerHero.playerA.ratingAfter,
      processed_at: pInput.processedAt,
    },
    {
      match_id: pInput.matchId,
      season_id: SEED_IDS.globalSeasonId,
      profile_id: pInput.proposal.player2Id,
      hero_id: pInput.proposal.hero2Id,
      rating_type: "playerHero",
      rating_before: playerHero.playerB.ratingBefore,
      expected_score: playerHero.playerB.expectedScore,
      actual_score: playerHero.playerB.actualScore,
      rating_change: playerHero.playerB.ratingChange,
      rating_after: playerHero.playerB.ratingAfter,
      processed_at: pInput.processedAt,
    },
  ]);

  if (eventsError) {
    throw new Error(eventsError.message);
  }

  const draws1 = rating1.draws_count ?? 0;
  const draws2 = rating2.draws_count ?? 0;
  const heroDraws1 = heroRating1.draws_count ?? 0;
  const heroDraws2 = heroRating2.draws_count ?? 0;

  const { error: rating1Error } = await admin
    .from("player_ratings")
    .update({
      rating: general.playerA.ratingAfter,
      matches_count: rating1.matches_count + 1,
      wins_count: rating1.wins_count + (winnerIsPlayer1 === true ? 1 : 0),
      losses_count: rating1.losses_count + (winnerIsPlayer1 === false ? 1 : 0),
      draws_count: draws1 + (isDraw ? 1 : 0),
      current_streak: streak1,
      best_rating: extremes1.bestRating,
      worst_rating: extremes1.worstRating,
      last_validated_match_at: pInput.processedAt,
    })
    .eq("profile_id", pInput.proposal.player1Id)
    .eq("season_id", SEED_IDS.globalSeasonId);

  if (rating1Error) {
    throw new Error(rating1Error.message);
  }

  const { error: rating2Error } = await admin
    .from("player_ratings")
    .update({
      rating: general.playerB.ratingAfter,
      matches_count: rating2.matches_count + 1,
      wins_count: rating2.wins_count + (winnerIsPlayer1 === false ? 1 : 0),
      losses_count: rating2.losses_count + (winnerIsPlayer1 === true ? 1 : 0),
      draws_count: draws2 + (isDraw ? 1 : 0),
      current_streak: streak2,
      best_rating: extremes2.bestRating,
      worst_rating: extremes2.worstRating,
      last_validated_match_at: pInput.processedAt,
    })
    .eq("profile_id", pInput.proposal.player2Id)
    .eq("season_id", SEED_IDS.globalSeasonId);

  if (rating2Error) {
    throw new Error(rating2Error.message);
  }

  const { error: hero1Error } = await admin
    .from("player_hero_ratings")
    .update({
      rating: playerHero.playerA.ratingAfter,
      matches_count: heroRating1.matches_count + 1,
      wins_count: heroRating1.wins_count + (winnerIsPlayer1 === true ? 1 : 0),
      losses_count: heroRating1.losses_count + (winnerIsPlayer1 === false ? 1 : 0),
      draws_count: heroDraws1 + (isDraw ? 1 : 0),
      last_used_at: pInput.processedAt,
    })
    .eq("profile_id", pInput.proposal.player1Id)
    .eq("hero_id", pInput.proposal.hero1Id)
    .eq("season_id", SEED_IDS.globalSeasonId);

  if (hero1Error) {
    throw new Error(hero1Error.message);
  }

  const { error: hero2Error } = await admin
    .from("player_hero_ratings")
    .update({
      rating: playerHero.playerB.ratingAfter,
      matches_count: heroRating2.matches_count + 1,
      wins_count: heroRating2.wins_count + (winnerIsPlayer1 === false ? 1 : 0),
      losses_count: heroRating2.losses_count + (winnerIsPlayer1 === true ? 1 : 0),
      draws_count: heroDraws2 + (isDraw ? 1 : 0),
      last_used_at: pInput.processedAt,
    })
    .eq("profile_id", pInput.proposal.player2Id)
    .eq("hero_id", pInput.proposal.hero2Id)
    .eq("season_id", SEED_IDS.globalSeasonId);

  if (hero2Error) {
    throw new Error(hero2Error.message);
  }
}
