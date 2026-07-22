import { PLAYER_ELO, PLAYER_HERO_ELO } from "@/domain/constants";

/** Elo actual score: win / draw / loss. */
export type ActualScore = 0 | 0.5 | 1;

export type EloParticipantResult = {
  ratingBefore: number;
  expectedScore: number;
  actualScore: ActualScore;
  ratingChange: number;
  ratingAfter: number;
};

export type TwoPlayerEloResult = {
  playerA: EloParticipantResult;
  playerB: EloParticipantResult;
};

/**
 * Standard Elo expected score for player A against player B.
 */
export function computeExpectedScore(pRatingA: number, pRatingB: number): number {
  return 1 / (1 + 10 ** ((pRatingB - pRatingA) / 400));
}

/**
 * Apply a finished 1v1 match to two ratings.
 * `winnerIsA === null` means draw (actual score 0.5 for both).
 * Player B's rating change is exactly the opposite of player A's (before display rounding).
 */
export function applyTwoPlayerElo(pInput: {
  ratingA: number;
  ratingB: number;
  winnerIsA: boolean | null;
  kFactor: number;
}): TwoPlayerEloResult {
  const actualScoreA: ActualScore =
    pInput.winnerIsA === null ? 0.5 : pInput.winnerIsA ? 1 : 0;
  const actualScoreB: ActualScore =
    pInput.winnerIsA === null ? 0.5 : pInput.winnerIsA ? 0 : 1;
  const expectedScoreA = computeExpectedScore(pInput.ratingA, pInput.ratingB);
  const expectedScoreB = 1 - expectedScoreA;
  const ratingChangeA = pInput.kFactor * (actualScoreA - expectedScoreA);
  const ratingChangeB = -ratingChangeA;

  return {
    playerA: {
      ratingBefore: pInput.ratingA,
      expectedScore: expectedScoreA,
      actualScore: actualScoreA,
      ratingChange: ratingChangeA,
      ratingAfter: pInput.ratingA + ratingChangeA,
    },
    playerB: {
      ratingBefore: pInput.ratingB,
      expectedScore: expectedScoreB,
      actualScore: actualScoreB,
      ratingChange: ratingChangeB,
      ratingAfter: pInput.ratingB + ratingChangeB,
    },
  };
}

export function applyGeneralElo(pInput: {
  ratingA: number;
  ratingB: number;
  winnerIsA: boolean | null;
}): TwoPlayerEloResult {
  return applyTwoPlayerElo({
    ...pInput,
    kFactor: PLAYER_ELO.kFactor,
  });
}

export function applyPlayerHeroElo(pInput: {
  ratingA: number;
  ratingB: number;
  winnerIsA: boolean | null;
}): TwoPlayerEloResult {
  return applyTwoPlayerElo({
    ...pInput,
    kFactor: PLAYER_HERO_ELO.kFactor,
  });
}

/**
 * Round a stored decimal rating for UI display only.
 */
export function roundRatingForDisplay(pRating: number): number {
  return Math.round(pRating);
}

/**
 * Format an Elo rating for UI — always an integer, never decimals.
 */
export function formatEloDisplay(pRating: number): string {
  return String(roundRatingForDisplay(pRating));
}

/**
 * Format an Elo delta for UI — always an integer, with an explicit sign when positive.
 */
export function formatEloDeltaDisplay(pDelta: number): string {
  const rounded = roundRatingForDisplay(pDelta);
  return rounded > 0 ? `+${rounded}` : String(rounded);
}

/**
 * Current win streak: increments on win, resets on loss or draw.
 */
export function nextWinStreak(pCurrentWinStreak: number, pWon: boolean): number {
  if (pCurrentWinStreak < 0) {
    throw new Error("Win streak cannot be negative.");
  }
  return pWon ? pCurrentWinStreak + 1 : 0;
}

export function nextBestWinStreak(pBestWinStreak: number, pCurrentWinStreak: number): number {
  if (pBestWinStreak < 0 || pCurrentWinStreak < 0) {
    throw new Error("Win streak cannot be negative.");
  }
  return Math.max(pBestWinStreak, pCurrentWinStreak);
}

export function updateBestAndWorstRatings(pInput: {
  previousBest: number;
  previousWorst: number | null;
  newRating: number;
  matchesCountBefore: number;
}): { bestRating: number; worstRating: number } {
  const bestRating = Math.max(pInput.previousBest, pInput.newRating);
  // Worst Elo is tracked only after the first match, per specifications.
  if (pInput.matchesCountBefore === 0) {
    return {
      bestRating,
      worstRating: pInput.newRating,
    };
  }

  const previousWorst = pInput.previousWorst ?? pInput.previousBest;
  return {
    bestRating,
    worstRating: Math.min(previousWorst, pInput.newRating),
  };
}
