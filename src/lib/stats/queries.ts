import { roundRatingForDisplay } from "@/domain/elo/calculate";
import { formatWinRate } from "@/domain/rankings/ranks";
import {
  aggregateHeroConfrontation,
  aggregateHeroStats,
  aggregatePlayerConfrontation,
  pickFavorableMatchups,
  type MatchFact,
} from "@/domain/stats/aggregates";
import { computeConfrontationHealthStats } from "@/domain/stats/health";
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

async function loadValidatedMatchFacts(): Promise<MatchFact[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "validated")
    .eq("season_id", SEED_IDS.globalSeasonId)
    .order("validated_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const facts: MatchFact[] = [];
  for (const row of data ?? []) {
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
    facts.push({
      matchId: match.id,
      playedAt: proposal.playedAt,
      validatedAt: match.validatedAt,
      player1Id: proposal.player1Id,
      player2Id: proposal.player2Id,
      hero1Id: proposal.hero1Id,
      hero2Id: proposal.hero2Id,
      winnerProfileId: proposal.winnerProfileId,
      winnerRemainingHealth: proposal.winnerRemainingHealth,
      achievementsEligible: match.achievementsEligible,
    });
  }
  return facts;
}

export type HeroListStat = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
  distinctPlayers: number;
  popularityShare: number;
};

export async function listHeroStats(): Promise<HeroListStat[]> {
  const supabase = await createSupabaseServerClient();
  const [heroesResponse, facts] = await Promise.all([
    supabase.from("heroes").select("*").order("name", { ascending: true }),
    loadValidatedMatchFacts(),
  ]);

  if (heroesResponse.error) {
    throw new Error(heroesResponse.error.message);
  }

  const aggregates = aggregateHeroStats(facts);
  const totalMatches = facts.length;
  const heroes = ((heroesResponse.data ?? []) as HeroDbRow[]).map(mapHeroRow);

  return heroes.map((pHero) => {
    const stats = aggregates.get(pHero.id);
    const matchesCount = stats?.matchesCount ?? 0;
    return {
      id: pHero.id,
      name: pHero.name,
      slug: pHero.slug,
      isActive: pHero.isActive,
      matchesCount,
      winsCount: stats?.winsCount ?? 0,
      lossesCount: stats?.lossesCount ?? 0,
      winRateLabel: formatWinRate(stats?.winsCount ?? 0, matchesCount),
      distinctPlayers: stats?.distinctPlayers ?? 0,
      popularityShare: totalMatches === 0 ? 0 : matchesCount / (totalMatches * 2),
    };
  });
}

export type HeroDetailStats = {
  hero: ReturnType<typeof mapHeroRow>;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
  distinctPlayers: number;
  popularityShare: number;
  bestPlayerHero: {
    pseudo: string;
    playerSlug: string;
    ratingDisplay: number;
    matchesCount: number;
  } | null;
  favorable: Array<{
    heroName: string;
    heroSlug: string;
    wins: number;
    losses: number;
    matchesCount: number;
    winRateLabel: string;
  }>;
  unfavorable: Array<{
    heroName: string;
    heroSlug: string;
    wins: number;
    losses: number;
    matchesCount: number;
    winRateLabel: string;
  }>;
  allMatchups: Array<{
    heroName: string;
    heroSlug: string;
    wins: number;
    losses: number;
    matchesCount: number;
    winRateLabel: string;
  }>;
  recentMatches: Array<{
    id: string;
    playedAt: string;
    playerPseudo: string;
    opponentHeroName: string;
    won: boolean | null;
  }>;
};

export async function getHeroDetailStats(
  pSlug: string,
  pMinMatchupMatches = 3,
): Promise<HeroDetailStats | null> {
  const supabase = await createSupabaseServerClient();
  const heroResponse = await supabase.from("heroes").select("*").eq("slug", pSlug).maybeSingle();
  if (heroResponse.error) {
    throw new Error(heroResponse.error.message);
  }
  if (!heroResponse.data) {
    return null;
  }

  const hero = mapHeroRow(heroResponse.data as HeroDbRow);
  const [facts, heroesResponse, bestComboResponse] = await Promise.all([
    loadValidatedMatchFacts(),
    supabase.from("heroes").select("*"),
    supabase
      .from("player_hero_ratings")
      .select("rating, matches_count, profiles!inner(pseudo, slug)")
      .eq("hero_id", hero.id)
      .eq("season_id", SEED_IDS.globalSeasonId)
      .gt("matches_count", 0)
      .order("rating", { ascending: false })
      .limit(1),
  ]);

  if (heroesResponse.error) {
    throw new Error(heroesResponse.error.message);
  }
  if (bestComboResponse.error) {
    throw new Error(bestComboResponse.error.message);
  }

  const heroesById = new Map(
    ((heroesResponse.data ?? []) as HeroDbRow[]).map((pRow) => [pRow.id, mapHeroRow(pRow)]),
  );
  const aggregates = aggregateHeroStats(facts);
  const aggregate = aggregates.get(hero.id);
  const totalMatches = facts.length;
  const matchups = aggregate?.matchups ?? [];
  const { favorable, unfavorable } = pickFavorableMatchups(matchups, pMinMatchupMatches);

  function mapMatchup(pRow: (typeof matchups)[number]) {
    const opponent = heroesById.get(pRow.opponentHeroId);
    return {
      heroName: opponent?.name ?? "?",
      heroSlug: opponent?.slug ?? "",
      wins: pRow.wins,
      losses: pRow.losses,
      matchesCount: pRow.matchesCount,
      winRateLabel: pRow.winRateLabel,
    };
  }

  const recentFacts = facts
    .filter((pFact) => pFact.hero1Id === hero.id || pFact.hero2Id === hero.id)
    .sort((pLeft, pRight) => (pLeft.validatedAt < pRight.validatedAt ? 1 : -1))
    .slice(0, 15);

  const recentMatches: HeroDetailStats["recentMatches"] = [];
  for (const fact of recentFacts) {
    const isHero1 = fact.hero1Id === hero.id;
    const playerId = isHero1 ? fact.player1Id : fact.player2Id;
    const opponentHeroId = isHero1 ? fact.hero2Id : fact.hero1Id;
    const playerResponse = await supabase.from("profiles").select("*").eq("id", playerId).single();
    if (playerResponse.error || !playerResponse.data) {
      continue;
    }
    const player = mapProfileRow(playerResponse.data as ProfileDbRow);
    recentMatches.push({
      id: fact.matchId,
      playedAt: fact.playedAt,
      playerPseudo: player.pseudo,
      opponentHeroName: heroesById.get(opponentHeroId)?.name ?? "?",
      won:
        fact.winnerProfileId === null ? null : fact.winnerProfileId === playerId,
    });
  }

  const bestCombo = (bestComboResponse.data?.[0] ?? null) as
    | {
        rating: string | number;
        matches_count: number;
        profiles: { pseudo: string; slug: string };
      }
    | null;

  return {
    hero,
    matchesCount: aggregate?.matchesCount ?? 0,
    winsCount: aggregate?.winsCount ?? 0,
    lossesCount: aggregate?.lossesCount ?? 0,
    winRateLabel: formatWinRate(aggregate?.winsCount ?? 0, aggregate?.matchesCount ?? 0),
    distinctPlayers: aggregate?.distinctPlayers ?? 0,
    popularityShare: totalMatches === 0 ? 0 : (aggregate?.matchesCount ?? 0) / (totalMatches * 2),
    bestPlayerHero: bestCombo
      ? {
          pseudo: bestCombo.profiles.pseudo,
          playerSlug: bestCombo.profiles.slug,
          ratingDisplay: roundRatingForDisplay(Number(bestCombo.rating)),
          matchesCount: bestCombo.matches_count,
        }
      : null,
    favorable: favorable.map(mapMatchup),
    unfavorable: unfavorable.map(mapMatchup),
    allMatchups: matchups.map(mapMatchup),
    recentMatches,
  };
}

export type PlayerConfrontationView = {
  playerA: ReturnType<typeof mapProfileRow>;
  playerB: ReturnType<typeof mapProfileRow>;
  matchesCount: number;
  winsA: number;
  winsB: number;
  winRateALabel: string;
  winRateBLabel: string;
  eloDeltaA: number;
  eloDeltaB: number;
  heroesA: Array<{ name: string; slug: string; matchesCount: number }>;
  heroesB: Array<{ name: string; slug: string; matchesCount: number }>;
  recentMatches: Array<{
    id: string;
    playedAt: string;
    winnerPseudo: string | null;
    heroAName: string;
    heroBName: string;
    winnerRemainingHealth: number;
  }>;
  health: {
    averageHpWhenAWins: number | null;
    averageHpWhenBWins: number | null;
    medianWinnerHp: number | null;
    closestWin: { winnerProfileId: string; hp: number; matchId: string } | null;
    largestWin: { winnerProfileId: string; hp: number; matchId: string } | null;
  };
};

export async function getPlayerConfrontation(
  pSlugA: string,
  pSlugB: string,
): Promise<PlayerConfrontationView | null> {
  if (pSlugA === pSlugB) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [playerAResponse, playerBResponse, facts, heroesResponse] = await Promise.all([
    supabase.from("profiles").select("*").eq("slug", pSlugA).maybeSingle(),
    supabase.from("profiles").select("*").eq("slug", pSlugB).maybeSingle(),
    loadValidatedMatchFacts(),
    supabase.from("heroes").select("*"),
  ]);

  if (playerAResponse.error || playerBResponse.error || heroesResponse.error) {
    throw new Error(
      playerAResponse.error?.message ??
        playerBResponse.error?.message ??
        heroesResponse.error?.message,
    );
  }
  if (!playerAResponse.data || !playerBResponse.data) {
    return null;
  }

  const playerA = mapProfileRow(playerAResponse.data as ProfileDbRow);
  const playerB = mapProfileRow(playerBResponse.data as ProfileDbRow);
  const heroesById = new Map(
    ((heroesResponse.data ?? []) as HeroDbRow[]).map((pRow) => [pRow.id, mapHeroRow(pRow)]),
  );
  const aggregate = aggregatePlayerConfrontation(facts, playerA.id, playerB.id);

  const matchIds = aggregate.recentMatchIds;
  let eloDeltaA = 0;
  if (matchIds.length > 0) {
    const eventsResponse = await supabase
      .from("rating_events")
      .select("profile_id, rating_change, match_id")
      .eq("rating_type", "general")
      .in("match_id", matchIds)
      .in("profile_id", [playerA.id, playerB.id]);
    if (eventsResponse.error) {
      throw new Error(eventsResponse.error.message);
    }
    for (const event of eventsResponse.data ?? []) {
      if (event.profile_id === playerA.id) {
        eloDeltaA += Number(event.rating_change);
      }
    }
  }

  function mapHeroUsage(pUsage: Map<string, number>) {
    return [...pUsage.entries()]
      .map(([heroId, matchesCount]) => ({
        name: heroesById.get(heroId)?.name ?? "?",
        slug: heroesById.get(heroId)?.slug ?? "",
        matchesCount,
      }))
      .sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount);
  }

  const recentMatches: PlayerConfrontationView["recentMatches"] = [];
  for (const matchId of matchIds.slice(0, 15)) {
    const fact = facts.find((pFact) => pFact.matchId === matchId);
    if (!fact) {
      continue;
    }
    const aIsPlayer1 = fact.player1Id === playerA.id;
    recentMatches.push({
      id: fact.matchId,
      playedAt: fact.playedAt,
      winnerPseudo:
        fact.winnerProfileId === null
          ? null
          : fact.winnerProfileId === playerA.id
            ? playerA.pseudo
            : playerB.pseudo,
      heroAName: heroesById.get(aIsPlayer1 ? fact.hero1Id : fact.hero2Id)?.name ?? "?",
      heroBName: heroesById.get(aIsPlayer1 ? fact.hero2Id : fact.hero1Id)?.name ?? "?",
      winnerRemainingHealth: fact.winnerRemainingHealth,
    });
  }

  const pairFacts = facts.filter(
    (pFact) =>
      (pFact.player1Id === playerA.id && pFact.player2Id === playerB.id) ||
      (pFact.player1Id === playerB.id && pFact.player2Id === playerA.id),
  );
  const health = computeConfrontationHealthStats(
    playerA.id,
    playerB.id,
    pairFacts.map((pFact) => ({
      matchId: pFact.matchId,
      validatedAt: pFact.validatedAt,
      winnerProfileId: pFact.winnerProfileId,
      winnerRemainingHealth: pFact.winnerRemainingHealth,
      pvReliable: true,
    })),
  );

  return {
    playerA,
    playerB,
    matchesCount: aggregate.matchesCount,
    winsA: aggregate.winsA,
    winsB: aggregate.winsB,
    winRateALabel: formatWinRate(aggregate.winsA, aggregate.matchesCount),
    winRateBLabel: formatWinRate(aggregate.winsB, aggregate.matchesCount),
    eloDeltaA,
    eloDeltaB: -eloDeltaA,
    heroesA: mapHeroUsage(aggregate.heroesUsedByA),
    heroesB: mapHeroUsage(aggregate.heroesUsedByB),
    recentMatches,
    health,
  };
}

export type HeroConfrontationView = {
  heroA: ReturnType<typeof mapHeroRow>;
  heroB: ReturnType<typeof mapHeroRow>;
  matchesCount: number;
  winsA: number;
  winsB: number;
  winRateALabel: string;
  winRateBLabel: string;
  players: Array<{ pseudo: string; slug: string }>;
  recentMatches: Array<{
    id: string;
    playedAt: string;
    winnerHeroName: string | null;
    player1Pseudo: string;
    player2Pseudo: string;
  }>;
};

export async function getHeroConfrontation(
  pSlugA: string,
  pSlugB: string,
): Promise<HeroConfrontationView | null> {
  if (pSlugA === pSlugB) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [heroAResponse, heroBResponse, facts] = await Promise.all([
    supabase.from("heroes").select("*").eq("slug", pSlugA).maybeSingle(),
    supabase.from("heroes").select("*").eq("slug", pSlugB).maybeSingle(),
    loadValidatedMatchFacts(),
  ]);

  if (heroAResponse.error || heroBResponse.error) {
    throw new Error(heroAResponse.error?.message ?? heroBResponse.error?.message);
  }
  if (!heroAResponse.data || !heroBResponse.data) {
    return null;
  }

  const heroA = mapHeroRow(heroAResponse.data as HeroDbRow);
  const heroB = mapHeroRow(heroBResponse.data as HeroDbRow);
  const aggregate = aggregateHeroConfrontation(facts, heroA.id, heroB.id);

  const players: HeroConfrontationView["players"] = [];
  for (const profileId of aggregate.players) {
    const profileResponse = await supabase.from("profiles").select("*").eq("id", profileId).single();
    if (profileResponse.data) {
      const profile = mapProfileRow(profileResponse.data as ProfileDbRow);
      players.push({ pseudo: profile.pseudo, slug: profile.slug });
    }
  }

  const recentMatches: HeroConfrontationView["recentMatches"] = [];
  for (const matchId of aggregate.recentMatchIds.slice(0, 15)) {
    const fact = facts.find((pFact) => pFact.matchId === matchId);
    if (!fact) {
      continue;
    }
    const [p1Response, p2Response] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", fact.player1Id).single(),
      supabase.from("profiles").select("*").eq("id", fact.player2Id).single(),
    ]);
    if (!p1Response.data || !p2Response.data) {
      continue;
    }
    const player1 = mapProfileRow(p1Response.data as ProfileDbRow);
    const player2 = mapProfileRow(p2Response.data as ProfileDbRow);
    const winnerIsPlayer1 = fact.winnerProfileId === fact.player1Id;
    const winnerHeroId =
      fact.winnerProfileId === null
        ? null
        : winnerIsPlayer1
          ? fact.hero1Id
          : fact.hero2Id;
    recentMatches.push({
      id: fact.matchId,
      playedAt: fact.playedAt,
      winnerHeroName:
        winnerHeroId === null ? null : winnerHeroId === heroA.id ? heroA.name : heroB.name,
      player1Pseudo: player1.pseudo,
      player2Pseudo: player2.pseudo,
    });
  }

  return {
    heroA,
    heroB,
    matchesCount: aggregate.matchesCount,
    winsA: aggregate.winsA,
    winsB: aggregate.winsB,
    winRateALabel: formatWinRate(aggregate.winsA, aggregate.matchesCount),
    winRateBLabel: formatWinRate(aggregate.winsB, aggregate.matchesCount),
    players: players.sort((pLeft, pRight) => pLeft.pseudo.localeCompare(pRight.pseudo, "fr")),
    recentMatches,
  };
}

export async function listPublicPlayersForSelect(): Promise<
  Array<{ slug: string; pseudo: string }>
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("slug, pseudo")
    .in("status", ["active", "preloaded", "suspended"])
    .order("pseudo", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ slug: string; pseudo: string }>;
}

export async function listHeroesForSelect(): Promise<Array<{ slug: string; name: string }>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("heroes")
    .select("slug, name")
    .order("name", { ascending: true });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Array<{ slug: string; name: string }>;
}
