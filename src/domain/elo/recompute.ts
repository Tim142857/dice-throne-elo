import {
  applyGeneralElo,
  applyPlayerHeroElo,
  nextWinStreak,
  updateBestAndWorstRatings,
} from "@/domain/elo/calculate";
import { PLAYER_ELO, PLAYER_HERO_ELO } from "@/domain/constants";

export type RecomputeMatchInput = {
  matchId: string;
  validatedAt: string;
  player1Id: string;
  player2Id: string;
  hero1Id: string;
  hero2Id: string;
  winnerProfileId: string | null;
};

export type RatingEventDraft = {
  matchId: string;
  profileId: string;
  heroId: string | null;
  ratingType: "general" | "playerHero";
  ratingBefore: number;
  expectedScore: number;
  actualScore: number;
  ratingChange: number;
  ratingAfter: number;
  processedAt: string;
};

export type PlayerRatingSnapshot = {
  profileId: string;
  rating: number;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;
  currentStreak: number;
  bestRating: number;
  worstRating: number | null;
  lastValidatedMatchAt: string | null;
};

export type PlayerHeroRatingSnapshot = {
  profileId: string;
  heroId: string;
  rating: number;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;
  lastUsedAt: string | null;
};

export type RecomputeResult = {
  orderedMatchIds: string[];
  playerRatings: PlayerRatingSnapshot[];
  playerHeroRatings: PlayerHeroRatingSnapshot[];
  events: RatingEventDraft[];
};

function playerKey(pProfileId: string): string {
  return pProfileId;
}

function heroKey(pProfileId: string, pHeroId: string): string {
  return `${pProfileId}::${pHeroId}`;
}

/**
 * Deterministic ordering: validatedAt ascending, then matchId.
 */
export function sortMatchesForRecompute(
  pMatches: RecomputeMatchInput[],
): RecomputeMatchInput[] {
  return [...pMatches].sort((pLeft, pRight) => {
    if (pLeft.validatedAt !== pRight.validatedAt) {
      return pLeft.validatedAt < pRight.validatedAt ? -1 : 1;
    }
    return pLeft.matchId < pRight.matchId ? -1 : pLeft.matchId > pRight.matchId ? 1 : 0;
  });
}

function ensurePlayer(
  pMap: Map<string, PlayerRatingSnapshot>,
  pProfileId: string,
): PlayerRatingSnapshot {
  const key = playerKey(pProfileId);
  const existing = pMap.get(key);
  if (existing) {
    return existing;
  }
  const created: PlayerRatingSnapshot = {
    profileId: pProfileId,
    rating: PLAYER_ELO.initialRating,
    matchesCount: 0,
    winsCount: 0,
    lossesCount: 0,
    drawsCount: 0,
    currentStreak: 0,
    bestRating: PLAYER_ELO.initialRating,
    worstRating: null,
    lastValidatedMatchAt: null,
  };
  pMap.set(key, created);
  return created;
}

function ensureHero(
  pMap: Map<string, PlayerHeroRatingSnapshot>,
  pProfileId: string,
  pHeroId: string,
): PlayerHeroRatingSnapshot {
  const key = heroKey(pProfileId, pHeroId);
  const existing = pMap.get(key);
  if (existing) {
    return existing;
  }
  const created: PlayerHeroRatingSnapshot = {
    profileId: pProfileId,
    heroId: pHeroId,
    rating: PLAYER_HERO_ELO.initialRating,
    matchesCount: 0,
    winsCount: 0,
    lossesCount: 0,
    drawsCount: 0,
    lastUsedAt: null,
  };
  pMap.set(key, created);
  return created;
}

/**
 * Rebuild all Elo snapshots and events from validated matches only.
 * Pure function: no I/O.
 */
export function recomputeRatingsFromMatches(
  pMatches: RecomputeMatchInput[],
  pBaselineProfileIds: string[] = [],
): RecomputeResult {
  const ordered = sortMatchesForRecompute(pMatches);
  const players = new Map<string, PlayerRatingSnapshot>();
  const heroes = new Map<string, PlayerHeroRatingSnapshot>();
  const events: RatingEventDraft[] = [];

  for (const profileId of pBaselineProfileIds) {
    ensurePlayer(players, profileId);
  }

  for (const match of ordered) {
    const isDraw = match.winnerProfileId === null;
    const winnerIsPlayer1 = isDraw ? null : match.winnerProfileId === match.player1Id;
    const player1 = ensurePlayer(players, match.player1Id);
    const player2 = ensurePlayer(players, match.player2Id);
    const hero1 = ensureHero(heroes, match.player1Id, match.hero1Id);
    const hero2 = ensureHero(heroes, match.player2Id, match.hero2Id);

    const general = applyGeneralElo({
      ratingA: player1.rating,
      ratingB: player2.rating,
      winnerIsA: winnerIsPlayer1,
    });
    const playerHero = applyPlayerHeroElo({
      ratingA: hero1.rating,
      ratingB: hero2.rating,
      winnerIsA: winnerIsPlayer1,
    });

    const extremes1 = updateBestAndWorstRatings({
      previousBest: player1.bestRating,
      previousWorst: player1.worstRating,
      newRating: general.playerA.ratingAfter,
      matchesCountBefore: player1.matchesCount,
    });
    const extremes2 = updateBestAndWorstRatings({
      previousBest: player2.bestRating,
      previousWorst: player2.worstRating,
      newRating: general.playerB.ratingAfter,
      matchesCountBefore: player2.matchesCount,
    });

    events.push(
      {
        matchId: match.matchId,
        profileId: match.player1Id,
        heroId: null,
        ratingType: "general",
        ratingBefore: general.playerA.ratingBefore,
        expectedScore: general.playerA.expectedScore,
        actualScore: general.playerA.actualScore,
        ratingChange: general.playerA.ratingChange,
        ratingAfter: general.playerA.ratingAfter,
        processedAt: match.validatedAt,
      },
      {
        matchId: match.matchId,
        profileId: match.player2Id,
        heroId: null,
        ratingType: "general",
        ratingBefore: general.playerB.ratingBefore,
        expectedScore: general.playerB.expectedScore,
        actualScore: general.playerB.actualScore,
        ratingChange: general.playerB.ratingChange,
        ratingAfter: general.playerB.ratingAfter,
        processedAt: match.validatedAt,
      },
      {
        matchId: match.matchId,
        profileId: match.player1Id,
        heroId: match.hero1Id,
        ratingType: "playerHero",
        ratingBefore: playerHero.playerA.ratingBefore,
        expectedScore: playerHero.playerA.expectedScore,
        actualScore: playerHero.playerA.actualScore,
        ratingChange: playerHero.playerA.ratingChange,
        ratingAfter: playerHero.playerA.ratingAfter,
        processedAt: match.validatedAt,
      },
      {
        matchId: match.matchId,
        profileId: match.player2Id,
        heroId: match.hero2Id,
        ratingType: "playerHero",
        ratingBefore: playerHero.playerB.ratingBefore,
        expectedScore: playerHero.playerB.expectedScore,
        actualScore: playerHero.playerB.actualScore,
        ratingChange: playerHero.playerB.ratingChange,
        ratingAfter: playerHero.playerB.ratingAfter,
        processedAt: match.validatedAt,
      },
    );

    players.set(playerKey(match.player1Id), {
      profileId: match.player1Id,
      rating: general.playerA.ratingAfter,
      matchesCount: player1.matchesCount + 1,
      winsCount: player1.winsCount + (winnerIsPlayer1 === true ? 1 : 0),
      lossesCount: player1.lossesCount + (winnerIsPlayer1 === false ? 1 : 0),
      drawsCount: player1.drawsCount + (isDraw ? 1 : 0),
      currentStreak: nextWinStreak(player1.currentStreak, winnerIsPlayer1 === true),
      bestRating: extremes1.bestRating,
      worstRating: extremes1.worstRating,
      lastValidatedMatchAt: match.validatedAt,
    });

    players.set(playerKey(match.player2Id), {
      profileId: match.player2Id,
      rating: general.playerB.ratingAfter,
      matchesCount: player2.matchesCount + 1,
      winsCount: player2.winsCount + (winnerIsPlayer1 === false ? 1 : 0),
      lossesCount: player2.lossesCount + (winnerIsPlayer1 === true ? 1 : 0),
      drawsCount: player2.drawsCount + (isDraw ? 1 : 0),
      currentStreak: nextWinStreak(player2.currentStreak, winnerIsPlayer1 === false),
      bestRating: extremes2.bestRating,
      worstRating: extremes2.worstRating,
      lastValidatedMatchAt: match.validatedAt,
    });

    heroes.set(heroKey(match.player1Id, match.hero1Id), {
      profileId: match.player1Id,
      heroId: match.hero1Id,
      rating: playerHero.playerA.ratingAfter,
      matchesCount: hero1.matchesCount + 1,
      winsCount: hero1.winsCount + (winnerIsPlayer1 === true ? 1 : 0),
      lossesCount: hero1.lossesCount + (winnerIsPlayer1 === false ? 1 : 0),
      drawsCount: hero1.drawsCount + (isDraw ? 1 : 0),
      lastUsedAt: match.validatedAt,
    });

    heroes.set(heroKey(match.player2Id, match.hero2Id), {
      profileId: match.player2Id,
      heroId: match.hero2Id,
      rating: playerHero.playerB.ratingAfter,
      matchesCount: hero2.matchesCount + 1,
      winsCount: hero2.winsCount + (winnerIsPlayer1 === false ? 1 : 0),
      lossesCount: hero2.lossesCount + (winnerIsPlayer1 === true ? 1 : 0),
      drawsCount: hero2.drawsCount + (isDraw ? 1 : 0),
      lastUsedAt: match.validatedAt,
    });
  }

  return {
    orderedMatchIds: ordered.map((pMatch) => pMatch.matchId),
    playerRatings: [...players.values()].sort((pLeft, pRight) =>
      pLeft.profileId.localeCompare(pRight.profileId),
    ),
    playerHeroRatings: [...heroes.values()].sort((pLeft, pRight) => {
      const byPlayer = pLeft.profileId.localeCompare(pRight.profileId);
      if (byPlayer !== 0) {
        return byPlayer;
      }
      return pLeft.heroId.localeCompare(pRight.heroId);
    }),
    events,
  };
}

export function ratingsFingerprint(pResult: RecomputeResult): string {
  const players = pResult.playerRatings
    .map(
      (pRow) =>
        `${pRow.profileId}:${pRow.rating.toFixed(6)}:${pRow.matchesCount}:${pRow.winsCount}:${pRow.lossesCount}:${pRow.drawsCount}:${pRow.currentStreak}`,
    )
    .join("|");
  const heroes = pResult.playerHeroRatings
    .map(
      (pRow) =>
        `${pRow.profileId}/${pRow.heroId}:${pRow.rating.toFixed(6)}:${pRow.matchesCount}`,
    )
    .join("|");
  return `${players}||${heroes}||events:${pResult.events.length}`;
}
