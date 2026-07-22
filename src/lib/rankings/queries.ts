import { cache } from "react";

import { roundRatingForDisplay } from "@/domain/elo/calculate";
import { buildEloHistoryPoints } from "@/domain/rankings/elo-history";
import {
  assignCompetitionRanks,
  computeBestWinStreak,
  formatWinRate,
} from "@/domain/rankings/ranks";
import { computePlayerHealthStats } from "@/domain/stats/health";
import {
  pickHeroWinRateExtremes,
  pickOpponentExtremes,
  type HeroWinRateSummary,
  type OpponentHeadToHead,
} from "@/domain/stats/aggregates";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SEED_IDS } from "@/types/database";

export type GeneralRankingSort = "rating" | "winRate" | "matches" | "wins";

export type GeneralRankingRow = {
  rank: number;
  profileId: string;
  pseudo: string;
  slug: string;
  rating: number;
  ratingDisplay: number;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
  currentStreak: number;
  distinctOpponents: number;
  lastValidatedMatchAt: string | null;
};

export type PlayerHeroRankingRow = {
  rank: number;
  profileId: string;
  pseudo: string;
  playerSlug: string;
  heroId: string;
  heroName: string;
  heroSlug: string;
  rating: number;
  ratingDisplay: number;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
  lastUsedAt: string | null;
};

function toNumber(pValue: string | number): number {
  return typeof pValue === "number" ? pValue : Number(pValue);
}

async function loadDistinctOpponentsByProfile(): Promise<Map<string, number>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select("player1_id, player2_id")
    .eq("status", "validated")
    .eq("season_id", SEED_IDS.globalSeasonId);

  if (error) {
    throw new Error(error.message);
  }

  const opponents = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const player1Id = row.player1_id as string;
    const player2Id = row.player2_id as string;
    if (!opponents.has(player1Id)) {
      opponents.set(player1Id, new Set());
    }
    if (!opponents.has(player2Id)) {
      opponents.set(player2Id, new Set());
    }
    opponents.get(player1Id)!.add(player2Id);
    opponents.get(player2Id)!.add(player1Id);
  }

  const counts = new Map<string, number>();
  for (const [profileId, set] of opponents) {
    counts.set(profileId, set.size);
  }
  return counts;
}

export async function listGeneralRankings(pInput?: {
  sort?: GeneralRankingSort;
  search?: string;
}): Promise<GeneralRankingRow[]> {
  const supabase = await createSupabaseServerClient();
  const [ratingsResponse, opponents] = await Promise.all([
    supabase
      .from("player_ratings")
      .select("*, profiles!inner(id, pseudo, slug, status)")
      .eq("season_id", SEED_IDS.globalSeasonId)
      .gt("matches_count", 0),
    loadDistinctOpponentsByProfile(),
  ]);

  if (ratingsResponse.error) {
    throw new Error(ratingsResponse.error.message);
  }

  const search = pInput?.search?.trim().toLocaleLowerCase("fr-FR") ?? "";

  let rows = ((ratingsResponse.data ?? []) as Array<{
    profile_id: string;
    rating: string | number;
    matches_count: number;
    wins_count: number;
    losses_count: number;
    current_streak: number;
    last_validated_match_at: string | null;
    profiles: { id: string; pseudo: string; slug: string; status: string };
  }>)
    .filter((pRow) => ["active", "preloaded", "suspended"].includes(pRow.profiles.status))
    .filter((pRow) =>
      search.length === 0 ? true : pRow.profiles.pseudo.toLocaleLowerCase("fr-FR").includes(search),
    )
    .map((pRow) => ({
      profileId: pRow.profile_id,
      pseudo: pRow.profiles.pseudo,
      slug: pRow.profiles.slug,
      rating: toNumber(pRow.rating),
      ratingDisplay: roundRatingForDisplay(toNumber(pRow.rating)),
      matchesCount: pRow.matches_count,
      winsCount: pRow.wins_count,
      lossesCount: pRow.losses_count,
      winRateLabel: formatWinRate(pRow.wins_count, pRow.matches_count),
      currentStreak: pRow.current_streak,
      distinctOpponents: opponents.get(pRow.profile_id) ?? 0,
      lastValidatedMatchAt: pRow.last_validated_match_at,
    }));

  const sort = pInput?.sort ?? "rating";
  rows = [...rows].sort((pLeft, pRight) => {
    switch (sort) {
      case "winRate": {
        const leftRate = pLeft.matchesCount === 0 ? -1 : pLeft.winsCount / pLeft.matchesCount;
        const rightRate = pRight.matchesCount === 0 ? -1 : pRight.winsCount / pRight.matchesCount;
        if (rightRate !== leftRate) {
          return rightRate - leftRate;
        }
        return pRight.rating - pLeft.rating;
      }
      case "matches":
        if (pRight.matchesCount !== pLeft.matchesCount) {
          return pRight.matchesCount - pLeft.matchesCount;
        }
        return pRight.rating - pLeft.rating;
      case "wins":
        if (pRight.winsCount !== pLeft.winsCount) {
          return pRight.winsCount - pLeft.winsCount;
        }
        return pRight.rating - pLeft.rating;
      case "rating":
      default:
        return pRight.rating - pLeft.rating;
    }
  });

  const rankKey =
    sort === "rating"
      ? (pItem: (typeof rows)[number]) => pItem.rating
      : sort === "matches"
        ? (pItem: (typeof rows)[number]) => pItem.matchesCount
        : sort === "wins"
          ? (pItem: (typeof rows)[number]) => pItem.winsCount
          : (pItem: (typeof rows)[number]) =>
              pItem.matchesCount === 0 ? -1 : pItem.winsCount / pItem.matchesCount;

  return assignCompetitionRanks(rows, rankKey);
}

export async function listPlayerHeroRankings(pInput?: {
  minMatches?: number;
  playerSlug?: string;
  heroSlug?: string;
  search?: string;
}): Promise<PlayerHeroRankingRow[]> {
  const supabase = await createSupabaseServerClient();
  const minMatches = pInput?.minMatches ?? 1;

  const { data, error } = await supabase
    .from("player_hero_ratings")
    .select(
      "*, profiles!inner(id, pseudo, slug, status), heroes!inner(id, name, slug, is_active)",
    )
    .eq("season_id", SEED_IDS.globalSeasonId)
    .gte("matches_count", minMatches);

  if (error) {
    throw new Error(error.message);
  }

  const search = pInput?.search?.trim().toLocaleLowerCase("fr-FR") ?? "";

  const rows = ((data ?? []) as Array<{
    profile_id: string;
    hero_id: string;
    rating: string | number;
    matches_count: number;
    wins_count: number;
    losses_count: number;
    last_used_at: string | null;
    profiles: { id: string; pseudo: string; slug: string; status: string };
    heroes: { id: string; name: string; slug: string; is_active: boolean };
  }>)
    .filter((pRow) => ["active", "preloaded", "suspended"].includes(pRow.profiles.status))
    .filter((pRow) =>
      pInput?.playerSlug ? pRow.profiles.slug === pInput.playerSlug : true,
    )
    .filter((pRow) => (pInput?.heroSlug ? pRow.heroes.slug === pInput.heroSlug : true))
    .filter((pRow) => {
      if (search.length === 0) {
        return true;
      }
      const haystack = `${pRow.profiles.pseudo} ${pRow.heroes.name}`.toLocaleLowerCase("fr-FR");
      return haystack.includes(search);
    })
    .map((pRow) => ({
      profileId: pRow.profile_id,
      pseudo: pRow.profiles.pseudo,
      playerSlug: pRow.profiles.slug,
      heroId: pRow.hero_id,
      heroName: pRow.heroes.name,
      heroSlug: pRow.heroes.slug,
      rating: toNumber(pRow.rating),
      ratingDisplay: roundRatingForDisplay(toNumber(pRow.rating)),
      matchesCount: pRow.matches_count,
      winsCount: pRow.wins_count,
      lossesCount: pRow.losses_count,
      winRateLabel: formatWinRate(pRow.wins_count, pRow.matches_count),
      lastUsedAt: pRow.last_used_at,
    }))
    .sort((pLeft, pRight) => pRight.rating - pLeft.rating);

  return assignCompetitionRanks(rows, (pItem) => pItem.rating);
}

export type PlayerPublicProfile = {
  profile: ReturnType<typeof mapProfileRow>;
  ratingDisplay: number;
  ratingExact: number;
  bestRatingDisplay: number;
  worstRatingDisplay: number | null;
  rank: number | null;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
  currentStreak: number;
  bestWinStreak: number;
  distinctOpponents: number;
  mostPlayedHero: { name: string; slug: string; matchesCount: number } | null;
  bestHero: { name: string; slug: string; ratingDisplay: number } | null;
  bestHeroByWinRate: HeroWinRateSummary | null;
  worstHeroByWinRate: HeroWinRateSummary | null;
  nemesis: OpponentHeadToHead | null;
  favoriteOpponent: OpponentHeadToHead | null;
  heroDistribution: Array<{
    name: string;
    slug: string;
    matchesCount: number;
    winsCount: number;
    lossesCount: number;
    winRateLabel: string;
  }>;
  recentForm: Array<boolean | null>;
  eloDeltaRecent5: number | null;
  recentMatches: Array<{
    id: string;
    playedAt: string;
    opponentPseudo: string;
    opponentSlug: string;
    won: boolean | null;
    heroName: string;
    winnerRemainingHealth: number;
  }>;
  healthStats: {
    averageWinnerHp: number | null;
    medianWinnerHp: number | null;
    closestWinHp: number | null;
    largestWinHp: number | null;
    winsWithAtMost5Hp: number;
    winsWithAtLeast20Hp: number;
  };
  eloHistory: Array<{ at: string; rating: number; ratingDisplay: number }>;
  recordsVsOpponents: Array<{
    opponentPseudo: string;
    opponentSlug: string;
    wins: number;
    losses: number;
    matchesCount: number;
    winRateLabel: string;
  }>;
};

const MIN_OPPONENT_MATCHES = 3;
const MIN_HERO_MATCHES = 3;

export async function getPlayerMetaBySlug(
  pSlug: string,
): Promise<{ pseudo: string; slug: string } | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("pseudo, slug")
    .eq("slug", pSlug)
    .in("status", ["active", "preloaded", "suspended"])
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  return { pseudo: data.pseudo as string, slug: data.slug as string };
}

/**
 * Competition rank by exact general Elo (1224): 1 + count of players strictly above.
 */
async function getGeneralRatingRank(
  pProfileId: string,
  pRating: number,
  pMatchesCount: number,
): Promise<number | null> {
  if (pMatchesCount <= 0) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("player_ratings")
    .select("profile_id, rating, profiles!inner(status)")
    .eq("season_id", SEED_IDS.globalSeasonId)
    .gt("matches_count", 0);

  if (error) {
    throw new Error(error.message);
  }

  const eligible = ((data ?? []) as unknown as Array<{
    profile_id: string;
    rating: string | number;
    profiles: { status: string };
  }>).filter((pRow) => ["active", "preloaded", "suspended"].includes(pRow.profiles.status));

  if (!eligible.some((pRow) => pRow.profile_id === pProfileId)) {
    return null;
  }

  const higherCount = eligible.filter((pRow) => toNumber(pRow.rating) > pRating).length;
  return higherCount + 1;
}

export const getPlayerPublicProfileBySlug = cache(
  async (pSlug: string): Promise<PlayerPublicProfile | null> => {
    const supabase = await createSupabaseServerClient();
    const profileResponse = await supabase
      .from("profiles")
      .select("*")
      .eq("slug", pSlug)
      .in("status", ["active", "preloaded", "suspended"])
      .maybeSingle();

    if (profileResponse.error) {
      throw new Error(profileResponse.error.message);
    }
    if (!profileResponse.data) {
      return null;
    }

    const profile = mapProfileRow(profileResponse.data as ProfileDbRow);

    const [ratingResponse, heroRatingsResponse, matchesResponse, eventsResponse] =
      await Promise.all([
        supabase
          .from("player_ratings")
          .select("rating, best_rating, worst_rating, matches_count, wins_count, losses_count, current_streak")
          .eq("profile_id", profile.id)
          .eq("season_id", SEED_IDS.globalSeasonId)
          .maybeSingle(),
        supabase
          .from("player_hero_ratings")
          .select("matches_count, wins_count, losses_count, rating, heroes!inner(name, slug)")
          .eq("profile_id", profile.id)
          .eq("season_id", SEED_IDS.globalSeasonId)
          .gt("matches_count", 0),
        supabase
          .from("matches")
          .select(
            "id, player1_id, player2_id, current_proposal_id, validated_at, status, season_id, created_by_profile_id, played_at, validated_by_profile_id, cancelled_at, import_source_key, achievements_eligible, created_at, updated_at",
          )
          .eq("status", "validated")
          .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
          .order("validated_at", { ascending: true }),
        supabase
          .from("rating_events")
          .select("processed_at, rating_after, rating_change")
          .eq("profile_id", profile.id)
          .eq("season_id", SEED_IDS.globalSeasonId)
          .eq("rating_type", "general")
          .order("processed_at", { ascending: true }),
      ]);

    if (ratingResponse.error) {
      throw new Error(ratingResponse.error.message);
    }
    if (heroRatingsResponse.error) {
      throw new Error(heroRatingsResponse.error.message);
    }
    if (matchesResponse.error) {
      throw new Error(matchesResponse.error.message);
    }
    if (eventsResponse.error) {
      throw new Error(eventsResponse.error.message);
    }

    const rating = ratingResponse.data as
      | {
          rating: string | number;
          best_rating: string | number;
          worst_rating: string | number | null;
          matches_count: number;
          wins_count: number;
          losses_count: number;
          current_streak: number;
        }
      | null;

    const ratingExact = rating ? toNumber(rating.rating) : 1000;
    const rankPromise = getGeneralRatingRank(
      profile.id,
      ratingExact,
      rating?.matches_count ?? 0,
    );

    const heroRows = ((heroRatingsResponse.data ?? []) as unknown as Array<{
      matches_count: number;
      wins_count: number;
      losses_count: number;
      rating: string | number;
      heroes: { name: string; slug: string };
    }>).map((pRow) => ({
      name: pRow.heroes.name,
      slug: pRow.heroes.slug,
      matchesCount: pRow.matches_count,
      winsCount: pRow.wins_count,
      lossesCount: pRow.losses_count,
      rating: toNumber(pRow.rating),
    }));

    const mostPlayedHero =
      [...heroRows].sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount)[0] ?? null;
    const bestHero =
      [...heroRows].sort((pLeft, pRight) => pRight.rating - pLeft.rating)[0] ?? null;

    const matches = ((matchesResponse.data ?? []) as MatchDbRow[])
      .map(mapMatchRow)
      .filter((pMatch) => pMatch.currentProposalId && pMatch.validatedAt);

    const recentMatches: PlayerPublicProfile["recentMatches"] = [];
    const resultsChronological: Array<boolean | null> = [];
    const vsMap = new Map<
      string,
      { pseudo: string; slug: string; wins: number; losses: number; draws: number }
    >();
    const healthFacts: Array<{
      matchId: string;
      validatedAt: string;
      winnerProfileId: string | null;
      winnerRemainingHealth: number;
      pvReliable: boolean;
    }> = [];

    let rank: number | null = null;

    if (matches.length > 0) {
      const proposalIds = matches.map((pMatch) => pMatch.currentProposalId!);
      const opponentIds = [
        ...new Set(
          matches.map((pMatch) =>
            pMatch.player1Id === profile.id ? pMatch.player2Id : pMatch.player1Id,
          ),
        ),
      ];

      const [rankResult, proposalsResponse, opponentsResponse] = await Promise.all([
        rankPromise,
        supabase.from("match_proposals").select("*").in("id", proposalIds),
        supabase.from("profiles").select("id, pseudo, slug").in("id", opponentIds),
      ]);
      rank = rankResult;

      if (proposalsResponse.error) {
        throw new Error(proposalsResponse.error.message);
      }
      if (opponentsResponse.error) {
        throw new Error(opponentsResponse.error.message);
      }

      const proposalsById = new Map(
        ((proposalsResponse.data ?? []) as MatchProposalDbRow[]).map((pRow) => [
          pRow.id,
          mapMatchProposalRow(pRow),
        ]),
      );
      const opponentsById = new Map(
        ((opponentsResponse.data ?? []) as Array<{ id: string; pseudo: string; slug: string }>).map(
          (pRow) => [pRow.id, pRow],
        ),
      );

      const heroIds = [
        ...new Set(
          matches.flatMap((pMatch) => {
            const proposal = proposalsById.get(pMatch.currentProposalId!);
            if (!proposal) {
              return [];
            }
            return [proposal.hero1Id, proposal.hero2Id];
          }),
        ),
      ];

      const heroesResponse =
        heroIds.length > 0
          ? await supabase.from("heroes").select("id, name, slug").in("id", heroIds)
          : { data: [], error: null };

      if (heroesResponse.error) {
        throw new Error(heroesResponse.error.message);
      }

      const heroesById = new Map(
        ((heroesResponse.data ?? []) as Array<{ id: string; name: string; slug: string }>).map(
          (pRow) => [pRow.id, pRow],
        ),
      );

      for (const match of matches) {
        const proposal = proposalsById.get(match.currentProposalId!);
        if (!proposal || !match.validatedAt) {
          continue;
        }

        const opponentId = match.player1Id === profile.id ? match.player2Id : match.player1Id;
        const opponent = opponentsById.get(opponentId);
        const heroId = match.player1Id === profile.id ? proposal.hero1Id : proposal.hero2Id;
        const hero = heroesById.get(heroId);
        if (!opponent || !hero) {
          continue;
        }

        const won =
          proposal.winnerProfileId === null
            ? null
            : proposal.winnerProfileId === profile.id;
        resultsChronological.push(won);

        const vs = vsMap.get(opponent.id) ?? {
          pseudo: opponent.pseudo,
          slug: opponent.slug,
          wins: 0,
          losses: 0,
          draws: 0,
        };
        if (won === true) {
          vs.wins += 1;
        } else if (won === false) {
          vs.losses += 1;
        } else {
          vs.draws += 1;
        }
        vsMap.set(opponent.id, vs);

        healthFacts.push({
          matchId: match.id,
          validatedAt: match.validatedAt,
          winnerProfileId: proposal.winnerProfileId,
          winnerRemainingHealth: proposal.winnerRemainingHealth,
          pvReliable: true,
        });

        recentMatches.push({
          id: match.id,
          playedAt: proposal.playedAt,
          opponentPseudo: opponent.pseudo,
          opponentSlug: opponent.slug,
          won,
          heroName: hero.name,
          winnerRemainingHealth: proposal.winnerRemainingHealth,
        });
      }
    } else {
      rank = await rankPromise;
    }

    // Keep most recent first for the match list UI.
    recentMatches.reverse();

    const healthStats = computePlayerHealthStats(profile.id, healthFacts);

    const ratingEvents = (eventsResponse.data ?? []) as Array<{
      processed_at: string;
      rating_after: string | number;
      rating_change: string | number;
    }>;

    const eloHistory = buildEloHistoryPoints(
      ratingEvents.map((pEvent) => ({
        processedAt: pEvent.processed_at,
        ratingAfter: toNumber(pEvent.rating_after),
        ratingDisplay: roundRatingForDisplay(toNumber(pEvent.rating_after)),
      })),
    );

    const recentRatingChanges = ratingEvents
      .slice(-5)
      .map((pEvent) => toNumber(pEvent.rating_change));
    const eloDeltaRecent5 =
      recentRatingChanges.length > 0
        ? roundRatingForDisplay(recentRatingChanges.reduce((pSum, pChange) => pSum + pChange, 0))
        : null;

    const recordsVsOpponents = [...vsMap.values()]
      .map((pRow) => {
        const matchesCount = pRow.wins + pRow.losses + pRow.draws;
        return {
          opponentPseudo: pRow.pseudo,
          opponentSlug: pRow.slug,
          wins: pRow.wins,
          losses: pRow.losses,
          matchesCount,
          winRateLabel: formatWinRate(pRow.wins, matchesCount),
        };
      })
      .sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount);

    const { nemesis, favoriteOpponent } = pickOpponentExtremes(
      recordsVsOpponents,
      MIN_OPPONENT_MATCHES,
    );
    const { best: bestHeroByWinRate, worst: worstHeroByWinRate } = pickHeroWinRateExtremes(
      heroRows,
      MIN_HERO_MATCHES,
    );

    return {
      profile,
      ratingExact,
      ratingDisplay: rating ? roundRatingForDisplay(toNumber(rating.rating)) : 1000,
      bestRatingDisplay: rating ? roundRatingForDisplay(toNumber(rating.best_rating)) : 1000,
      worstRatingDisplay:
        rating && rating.worst_rating !== null
          ? roundRatingForDisplay(toNumber(rating.worst_rating))
          : null,
      rank,
      matchesCount: rating?.matches_count ?? 0,
      winsCount: rating?.wins_count ?? 0,
      lossesCount: rating?.losses_count ?? 0,
      winRateLabel: formatWinRate(rating?.wins_count ?? 0, rating?.matches_count ?? 0),
      currentStreak: rating?.current_streak ?? 0,
      bestWinStreak: computeBestWinStreak(resultsChronological),
      distinctOpponents: vsMap.size,
      mostPlayedHero: mostPlayedHero
        ? {
            name: mostPlayedHero.name,
            slug: mostPlayedHero.slug,
            matchesCount: mostPlayedHero.matchesCount,
          }
        : null,
      bestHero: bestHero
        ? {
            name: bestHero.name,
            slug: bestHero.slug,
            ratingDisplay: roundRatingForDisplay(bestHero.rating),
          }
        : null,
      bestHeroByWinRate,
      worstHeroByWinRate,
      nemesis,
      favoriteOpponent,
      heroDistribution: [...heroRows]
        .sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount)
        .map((pRow) => ({
          name: pRow.name,
          slug: pRow.slug,
          matchesCount: pRow.matchesCount,
          winsCount: pRow.winsCount,
          lossesCount: pRow.lossesCount,
          winRateLabel: formatWinRate(pRow.winsCount, pRow.matchesCount),
        })),
      recentMatches: recentMatches.slice(0, 20),
      recentForm: resultsChronological.slice(-10),
      eloDeltaRecent5,
      healthStats: {
        averageWinnerHp: healthStats.averageWinnerHp,
        medianWinnerHp: healthStats.medianWinnerHp,
        closestWinHp: healthStats.closestWinHp,
        largestWinHp: healthStats.largestWinHp,
        winsWithAtMost5Hp: healthStats.winsWithAtMost5Hp,
        winsWithAtLeast20Hp: healthStats.winsWithAtLeast20Hp,
      },
      eloHistory,
      recordsVsOpponents,
    };
  },
);
