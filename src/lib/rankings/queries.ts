import { roundRatingForDisplay } from "@/domain/elo/calculate";
import {
  assignCompetitionRanks,
  computeBestWinStreak,
  formatWinRate,
} from "@/domain/rankings/ranks";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { mapHeroRow, type HeroDbRow } from "@/lib/mappers/hero";
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
  heroDistribution: Array<{ name: string; slug: string; matchesCount: number }>;
  recentMatches: Array<{
    id: string;
    playedAt: string;
    opponentPseudo: string;
    opponentSlug: string;
    won: boolean;
    heroName: string;
  }>;
  eloHistory: Array<{ at: string; rating: number; ratingDisplay: number }>;
  recordsVsOpponents: Array<{
    opponentPseudo: string;
    opponentSlug: string;
    wins: number;
    losses: number;
  }>;
};

export async function getPlayerPublicProfileBySlug(
  pSlug: string,
): Promise<PlayerPublicProfile | null> {
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

  const [ratingResponse, heroRatingsResponse, rankings, matchesResponse, eventsResponse] =
    await Promise.all([
      supabase
        .from("player_ratings")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("season_id", SEED_IDS.globalSeasonId)
        .maybeSingle(),
      supabase
        .from("player_hero_ratings")
        .select("*, heroes!inner(id, name, slug)")
        .eq("profile_id", profile.id)
        .eq("season_id", SEED_IDS.globalSeasonId)
        .gt("matches_count", 0),
      listGeneralRankings({ sort: "rating" }),
      supabase
        .from("matches")
        .select("*")
        .eq("status", "validated")
        .or(`player1_id.eq.${profile.id},player2_id.eq.${profile.id}`)
        .order("validated_at", { ascending: false }),
      supabase
        .from("rating_events")
        .select("*")
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

  const rank = rankings.find((pRow) => pRow.profileId === profile.id)?.rank ?? null;

  const heroRows = ((heroRatingsResponse.data ?? []) as Array<{
    matches_count: number;
    rating: string | number;
    heroes: { name: string; slug: string };
  }>).map((pRow) => ({
    name: pRow.heroes.name,
    slug: pRow.heroes.slug,
    matchesCount: pRow.matches_count,
    rating: toNumber(pRow.rating),
  }));

  const mostPlayedHero =
    [...heroRows].sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount)[0] ?? null;
  const bestHero =
    [...heroRows].sort((pLeft, pRight) => pRight.rating - pLeft.rating)[0] ?? null;

  const recentMatches: PlayerPublicProfile["recentMatches"] = [];
  const resultsChronological: boolean[] = [];
  const vsMap = new Map<string, { pseudo: string; slug: string; wins: number; losses: number }>();

  for (const row of [...(matchesResponse.data ?? [])].reverse()) {
    const match = mapMatchRow(row as MatchDbRow);
    if (!match.currentProposalId || !match.validatedAt) {
      continue;
    }
    const proposalResponse = await supabase
      .from("match_proposals")
      .select("*")
      .eq("id", match.currentProposalId)
      .single();
    if (proposalResponse.error || !proposalResponse.data) {
      continue;
    }
    const proposal = mapMatchProposalRow(proposalResponse.data as MatchProposalDbRow);
    const opponentId = match.player1Id === profile.id ? match.player2Id : match.player1Id;
    const heroId = match.player1Id === profile.id ? proposal.hero1Id : proposal.hero2Id;
    const won = proposal.winnerProfileId === profile.id;

    const [opponentResponse, heroResponse] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", opponentId).single(),
      supabase.from("heroes").select("*").eq("id", heroId).single(),
    ]);
    if (opponentResponse.error || heroResponse.error) {
      continue;
    }
    const opponent = mapProfileRow(opponentResponse.data as ProfileDbRow);
    const hero = mapHeroRow(heroResponse.data as HeroDbRow);

    resultsChronological.push(won);
    const vs = vsMap.get(opponent.id) ?? {
      pseudo: opponent.pseudo,
      slug: opponent.slug,
      wins: 0,
      losses: 0,
    };
    if (won) {
      vs.wins += 1;
    } else {
      vs.losses += 1;
    }
    vsMap.set(opponent.id, vs);

    recentMatches.unshift({
      id: match.id,
      playedAt: proposal.playedAt,
      opponentPseudo: opponent.pseudo,
      opponentSlug: opponent.slug,
      won,
      heroName: hero.name,
    });
  }

  const eloHistory = ((eventsResponse.data ?? []) as Array<{
    processed_at: string;
    rating_after: string | number;
  }>).map((pEvent) => ({
    at: pEvent.processed_at,
    rating: toNumber(pEvent.rating_after),
    ratingDisplay: roundRatingForDisplay(toNumber(pEvent.rating_after)),
  }));

  return {
    profile,
    ratingExact: rating ? toNumber(rating.rating) : 1000,
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
    heroDistribution: [...heroRows]
      .sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount)
      .map((pRow) => ({
        name: pRow.name,
        slug: pRow.slug,
        matchesCount: pRow.matchesCount,
      })),
    recentMatches: recentMatches.slice(0, 20),
    eloHistory,
    recordsVsOpponents: [...vsMap.values()]
      .map((pRow) => ({
        opponentPseudo: pRow.pseudo,
        opponentSlug: pRow.slug,
        wins: pRow.wins,
        losses: pRow.losses,
      }))
      .sort((pLeft, pRight) => pRight.wins + pRight.losses - (pLeft.wins + pLeft.losses)),
  };
}
