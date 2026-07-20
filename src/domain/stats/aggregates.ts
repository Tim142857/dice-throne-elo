import { formatWinRate } from "@/domain/rankings/ranks";

export type MatchFact = {
  matchId: string;
  playedAt: string;
  validatedAt: string;
  player1Id: string;
  player2Id: string;
  hero1Id: string;
  hero2Id: string;
  winnerProfileId: string;
  winnerRemainingHealth: number;
  achievementsEligible: boolean;
};

export type HeroMatchup = {
  opponentHeroId: string;
  wins: number;
  losses: number;
  matchesCount: number;
  winRateLabel: string;
};

export type HeroAggregate = {
  heroId: string;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
  distinctPlayers: number;
  matchups: HeroMatchup[];
};

/**
 * Aggregate per-hero stats and matchups from validated match facts.
 */
export function aggregateHeroStats(pMatches: MatchFact[]): Map<string, HeroAggregate> {
  const aggregates = new Map<
    string,
    {
      matchesCount: number;
      winsCount: number;
      lossesCount: number;
      players: Set<string>;
      vs: Map<string, { wins: number; losses: number }>;
    }
  >();

  function ensure(pHeroId: string) {
    const existing = aggregates.get(pHeroId);
    if (existing) {
      return existing;
    }
    const created = {
      matchesCount: 0,
      winsCount: 0,
      lossesCount: 0,
      players: new Set<string>(),
      vs: new Map<string, { wins: number; losses: number }>(),
    };
    aggregates.set(pHeroId, created);
    return created;
  }

  for (const match of pMatches) {
    const hero1 = ensure(match.hero1Id);
    const hero2 = ensure(match.hero2Id);
    hero1.matchesCount += 1;
    hero2.matchesCount += 1;
    hero1.players.add(match.player1Id);
    hero2.players.add(match.player2Id);

    const hero1Won = match.winnerProfileId === match.player1Id;
    if (hero1Won) {
      hero1.winsCount += 1;
      hero2.lossesCount += 1;
    } else {
      hero2.winsCount += 1;
      hero1.lossesCount += 1;
    }

    const vs12 = hero1.vs.get(match.hero2Id) ?? { wins: 0, losses: 0 };
    const vs21 = hero2.vs.get(match.hero1Id) ?? { wins: 0, losses: 0 };
    if (hero1Won) {
      vs12.wins += 1;
      vs21.losses += 1;
    } else {
      vs12.losses += 1;
      vs21.wins += 1;
    }
    hero1.vs.set(match.hero2Id, vs12);
    hero2.vs.set(match.hero1Id, vs21);
  }

  const result = new Map<string, HeroAggregate>();
  for (const [heroId, raw] of aggregates) {
    result.set(heroId, {
      heroId,
      matchesCount: raw.matchesCount,
      winsCount: raw.winsCount,
      lossesCount: raw.lossesCount,
      winRateLabel: formatWinRate(raw.winsCount, raw.matchesCount),
      distinctPlayers: raw.players.size,
      matchups: [...raw.vs.entries()]
        .map(([opponentHeroId, record]) => ({
          opponentHeroId,
          wins: record.wins,
          losses: record.losses,
          matchesCount: record.wins + record.losses,
          winRateLabel: formatWinRate(record.wins, record.wins + record.losses),
        }))
        .sort((pLeft, pRight) => pRight.matchesCount - pLeft.matchesCount),
    });
  }
  return result;
}

export type OpponentHeadToHead = {
  opponentPseudo: string;
  opponentSlug: string;
  wins: number;
  losses: number;
  matchesCount: number;
  winRateLabel: string;
};

export function pickOpponentExtremes(
  pRecords: Array<{
    opponentPseudo: string;
    opponentSlug: string;
    wins: number;
    losses: number;
  }>,
  pMinMatches: number,
): { nemesis: OpponentHeadToHead | null; favoriteOpponent: OpponentHeadToHead | null } {
  const enriched = pRecords
    .map((pRow) => {
      const matchesCount = pRow.wins + pRow.losses;
      return {
        ...pRow,
        matchesCount,
        winRateLabel: formatWinRate(pRow.wins, matchesCount),
      };
    })
    .filter((pRow) => pRow.matchesCount >= pMinMatches);

  if (enriched.length === 0) {
    return { nemesis: null, favoriteOpponent: null };
  }

  const scored = [...enriched].sort(
    (pLeft, pRight) => pLeft.wins / pLeft.matchesCount - pRight.wins / pRight.matchesCount,
  );

  return {
    nemesis: scored[0] ?? null,
    favoriteOpponent: scored[scored.length - 1] ?? null,
  };
}

export type HeroWinRateSummary = {
  name: string;
  slug: string;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  winRateLabel: string;
};

export function pickHeroWinRateExtremes(
  pHeroes: Array<{
    name: string;
    slug: string;
    matchesCount: number;
    winsCount: number;
    lossesCount: number;
  }>,
  pMinMatches: number,
): { best: HeroWinRateSummary | null; worst: HeroWinRateSummary | null } {
  const enriched = pHeroes
    .filter((pRow) => pRow.matchesCount >= pMinMatches)
    .map((pRow) => ({
      ...pRow,
      winRateLabel: formatWinRate(pRow.winsCount, pRow.matchesCount),
    }));

  if (enriched.length === 0) {
    return { best: null, worst: null };
  }

  const scored = [...enriched].sort(
    (pLeft, pRight) => pLeft.winsCount / pLeft.matchesCount - pRight.winsCount / pRight.matchesCount,
  );

  return {
    worst: scored[0] ?? null,
    best: scored[scored.length - 1] ?? null,
  };
}

export function pickFavorableMatchups(
  pMatchups: HeroMatchup[],
  pMinMatches: number,
): { favorable: HeroMatchup[]; unfavorable: HeroMatchup[] } {
  const filtered = pMatchups.filter((pRow) => pRow.matchesCount >= pMinMatches);
  const scored = [...filtered].sort((pLeft, pRight) => {
    const leftRate = pLeft.wins / pLeft.matchesCount;
    const rightRate = pRight.wins / pRight.matchesCount;
    return rightRate - leftRate;
  });
  return {
    favorable: scored.slice(0, 5),
    unfavorable: [...scored].reverse().slice(0, 5),
  };
}

export type PlayerConfrontationAggregate = {
  matchesCount: number;
  winsA: number;
  winsB: number;
  heroesUsedByA: Map<string, number>;
  heroesUsedByB: Map<string, number>;
  recentMatchIds: string[];
};

export function aggregatePlayerConfrontation(
  pMatches: MatchFact[],
  pPlayerAId: string,
  pPlayerBId: string,
): PlayerConfrontationAggregate {
  const relevant = pMatches
    .filter(
      (pMatch) =>
        (pMatch.player1Id === pPlayerAId && pMatch.player2Id === pPlayerBId) ||
        (pMatch.player1Id === pPlayerBId && pMatch.player2Id === pPlayerAId),
    )
    .sort((pLeft, pRight) => (pLeft.validatedAt < pRight.validatedAt ? 1 : -1));

  const heroesUsedByA = new Map<string, number>();
  const heroesUsedByB = new Map<string, number>();
  let winsA = 0;
  let winsB = 0;

  for (const match of relevant) {
    const aIsPlayer1 = match.player1Id === pPlayerAId;
    const heroA = aIsPlayer1 ? match.hero1Id : match.hero2Id;
    const heroB = aIsPlayer1 ? match.hero2Id : match.hero1Id;
    heroesUsedByA.set(heroA, (heroesUsedByA.get(heroA) ?? 0) + 1);
    heroesUsedByB.set(heroB, (heroesUsedByB.get(heroB) ?? 0) + 1);
    if (match.winnerProfileId === pPlayerAId) {
      winsA += 1;
    } else {
      winsB += 1;
    }
  }

  return {
    matchesCount: relevant.length,
    winsA,
    winsB,
    heroesUsedByA,
    heroesUsedByB,
    recentMatchIds: relevant.slice(0, 20).map((pMatch) => pMatch.matchId),
  };
}

export type HeroConfrontationAggregate = {
  matchesCount: number;
  winsA: number;
  winsB: number;
  players: Set<string>;
  recentMatchIds: string[];
};

export function aggregateHeroConfrontation(
  pMatches: MatchFact[],
  pHeroAId: string,
  pHeroBId: string,
): HeroConfrontationAggregate {
  const relevant = pMatches
    .filter(
      (pMatch) =>
        (pMatch.hero1Id === pHeroAId && pMatch.hero2Id === pHeroBId) ||
        (pMatch.hero1Id === pHeroBId && pMatch.hero2Id === pHeroAId),
    )
    .sort((pLeft, pRight) => (pLeft.validatedAt < pRight.validatedAt ? 1 : -1));

  let winsA = 0;
  let winsB = 0;
  const players = new Set<string>();

  for (const match of relevant) {
    players.add(match.player1Id);
    players.add(match.player2Id);
    const aIsHero1 = match.hero1Id === pHeroAId;
    const winnerIsPlayer1 = match.winnerProfileId === match.player1Id;
    const heroAWon = aIsHero1 ? winnerIsPlayer1 : !winnerIsPlayer1;
    if (heroAWon) {
      winsA += 1;
    } else {
      winsB += 1;
    }
  }

  return {
    matchesCount: relevant.length,
    winsA,
    winsB,
    players,
    recentMatchIds: relevant.slice(0, 20).map((pMatch) => pMatch.matchId),
  };
}
