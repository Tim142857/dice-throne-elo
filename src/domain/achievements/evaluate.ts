import { ACHIEVEMENT_DEFINITIONS, type AchievementDefinition } from "@/domain/achievements/definitions";
import { roundRatingForDisplay } from "@/domain/elo/calculate";

export type AchievementMatchFact = {
  matchId: string;
  validatedAt: string;
  achievementsEligible: boolean;
  player1Id: string;
  player2Id: string;
  hero1Id: string;
  hero2Id: string;
  winnerProfileId: string | null;
  winnerRemainingHealth: number;
  /** Exact general Elo of player1 before this match (null if unknown). */
  player1EloBefore: number | null;
  player2EloBefore: number | null;
  /** Exact general Elo after this match for each player (null if unknown). */
  player1EloAfter: number | null;
  player2EloAfter: number | null;
};

export type UnlockedAchievement = {
  code: string;
  unlockedAt: string;
  triggerMatchId: string | null;
  metadata: Record<string, unknown>;
};

export type AchievementProgress = {
  code: string;
  current: number;
  target: number | null;
};

export type EvaluateAchievementsInput = {
  profileId: string;
  /** Eligible + ineligible validated matches involving the player, ordered by validatedAt asc. */
  matches: AchievementMatchFact[];
  /** Active hero ids at evaluation time (for hero_wins_all). */
  activeHeroIds: string[];
  /** Already unlocked codes (kept forever unless full recompute removes invalid ones). */
  alreadyUnlocked: Set<string>;
};

function heroForPlayer(pMatch: AchievementMatchFact, pProfileId: string): string {
  return pMatch.player1Id === pProfileId ? pMatch.hero1Id : pMatch.hero2Id;
}

function won(pMatch: AchievementMatchFact, pProfileId: string): boolean {
  return pMatch.winnerProfileId === pProfileId;
}

function eloBefore(pMatch: AchievementMatchFact, pProfileId: string): number | null {
  return pMatch.player1Id === pProfileId ? pMatch.player1EloBefore : pMatch.player2EloBefore;
}

function eloAfter(pMatch: AchievementMatchFact, pProfileId: string): number | null {
  return pMatch.player1Id === pProfileId ? pMatch.player1EloAfter : pMatch.player2EloAfter;
}

function opponentEloBefore(pMatch: AchievementMatchFact, pProfileId: string): number | null {
  return pMatch.player1Id === pProfileId ? pMatch.player2EloBefore : pMatch.player1EloBefore;
}

function unlock(
  pCode: string,
  pMatch: AchievementMatchFact | null,
  pMetadata: Record<string, unknown> = {},
): UnlockedAchievement {
  return {
    code: pCode,
    unlockedAt: pMatch?.validatedAt ?? new Date().toISOString(),
    triggerMatchId: pMatch?.matchId ?? null,
    metadata: pMetadata,
  };
}

/**
 * Pure evaluation of V1 achievements for one player.
 * Only achievements-eligible matches count (playedAt on/after 2026-07-19).
 * Older matches are ignored for unlock and progress (neither increase nor break streaks).
 */
export function evaluateAchievementsForPlayer(
  pInput: EvaluateAchievementsInput,
): { newlyUnlocked: UnlockedAchievement[]; progress: AchievementProgress[] } {
  const eligible = pInput.matches
    .filter((pMatch) => pMatch.achievementsEligible)
    .sort((pLeft, pRight) => pLeft.validatedAt.localeCompare(pRight.validatedAt));

  const newlyUnlocked: UnlockedAchievement[] = [];
  const unlocked = new Set(pInput.alreadyUnlocked);

  function tryUnlock(pCode: string, pMatch: AchievementMatchFact | null, pMetadata?: Record<string, unknown>) {
    if (unlocked.has(pCode)) {
      return;
    }
    unlocked.add(pCode);
    newlyUnlocked.push(unlock(pCode, pMatch, pMetadata));
  }

  let matchesCount = 0;
  let winsCount = 0;
  let currentWinStreak = 0;
  let bestWinStreak = 0;
  let currentLossStreak = 0;
  const heroesWon = new Set<string>();
  const heroMatchCounts = new Map<string, number>();
  let bestSameHeroMatches = 0;
  let bestUnderdogDeficit = 0;
  let maxEloAfter = 0;
  let winAtOneHpMatch: AchievementMatchFact | null = null;
  let winAtThirtyHpMatch: AchievementMatchFact | null = null;
  let firstWinMatch: AchievementMatchFact | null = null;
  let comebackMatch: AchievementMatchFact | null = null;
  const streakUnlockMatches = new Map<string, AchievementMatchFact>();
  const underdogUnlockMatches = new Map<string, AchievementMatchFact>();
  const eloUnlockMatches = new Map<string, AchievementMatchFact>();
  const heroWinUnlockMatches = new Map<string, AchievementMatchFact>();
  let sameHeroUnlockMatch: AchievementMatchFact | null = null;
  let allHeroesUnlockMatch: AchievementMatchFact | null = null;

  for (const match of eligible) {
    matchesCount += 1;
    const heroId = heroForPlayer(match, pInput.profileId);
    heroMatchCounts.set(heroId, (heroMatchCounts.get(heroId) ?? 0) + 1);
    bestSameHeroMatches = Math.max(bestSameHeroMatches, heroMatchCounts.get(heroId) ?? 0);
    if (bestSameHeroMatches >= 10 && !sameHeroUnlockMatch) {
      sameHeroUnlockMatch = match;
    }

    const isWin = won(match, pInput.profileId);
    if (isWin) {
      winsCount += 1;
      if (!firstWinMatch) {
        firstWinMatch = match;
      }
      if (currentLossStreak >= 5 && !comebackMatch) {
        comebackMatch = match;
      }
      currentLossStreak = 0;
      currentWinStreak += 1;
      bestWinStreak = Math.max(bestWinStreak, currentWinStreak);
      if (currentWinStreak >= 3 && !streakUnlockMatches.has("win_streak_3")) {
        streakUnlockMatches.set("win_streak_3", match);
      }
      if (currentWinStreak >= 5 && !streakUnlockMatches.has("win_streak_5")) {
        streakUnlockMatches.set("win_streak_5", match);
      }
      if (currentWinStreak >= 10 && !streakUnlockMatches.has("win_streak_10")) {
        streakUnlockMatches.set("win_streak_10", match);
      }

      heroesWon.add(heroId);
      if (heroesWon.size >= 5 && !heroWinUnlockMatches.has("hero_wins_5")) {
        heroWinUnlockMatches.set("hero_wins_5", match);
      }
      if (heroesWon.size >= 10 && !heroWinUnlockMatches.has("hero_wins_10")) {
        heroWinUnlockMatches.set("hero_wins_10", match);
      }
      if (heroesWon.size >= 20 && !heroWinUnlockMatches.has("hero_wins_20")) {
        heroWinUnlockMatches.set("hero_wins_20", match);
      }
      if (
        pInput.activeHeroIds.length > 0 &&
        pInput.activeHeroIds.every((pHeroId) => heroesWon.has(pHeroId)) &&
        !allHeroesUnlockMatch
      ) {
        allHeroesUnlockMatch = match;
      }

      if (match.winnerRemainingHealth === 1 && !winAtOneHpMatch) {
        winAtOneHpMatch = match;
      }
      if (match.winnerRemainingHealth >= 30 && !winAtThirtyHpMatch) {
        winAtThirtyHpMatch = match;
      }

      const myBefore = eloBefore(match, pInput.profileId);
      const oppBefore = opponentEloBefore(match, pInput.profileId);
      if (myBefore !== null && oppBefore !== null) {
        const deficit = oppBefore - myBefore;
        bestUnderdogDeficit = Math.max(bestUnderdogDeficit, deficit);
        if (deficit >= 200 && !underdogUnlockMatches.has("underdog_200")) {
          underdogUnlockMatches.set("underdog_200", match);
        }
        if (deficit >= 500 && !underdogUnlockMatches.has("underdog_500")) {
          underdogUnlockMatches.set("underdog_500", match);
        }
        if (deficit >= 1000 && !underdogUnlockMatches.has("underdog_1000")) {
          underdogUnlockMatches.set("underdog_1000", match);
        }
      }
    } else if (match.winnerProfileId === null) {
      currentWinStreak = 0;
    } else {
      currentWinStreak = 0;
      currentLossStreak += 1;
    }

    const after = eloAfter(match, pInput.profileId);
    if (after !== null) {
      maxEloAfter = Math.max(maxEloAfter, after);
      if (after >= 1200 && !eloUnlockMatches.has("elo_1200")) {
        eloUnlockMatches.set("elo_1200", match);
      }
      if (after >= 1500 && !eloUnlockMatches.has("elo_1500")) {
        eloUnlockMatches.set("elo_1500", match);
      }
      if (after >= 2000 && !eloUnlockMatches.has("elo_2000")) {
        eloUnlockMatches.set("elo_2000", match);
      }
    }
  }

  if (firstWinMatch) {
    tryUnlock("first_win", firstWinMatch);
  }
  if (matchesCount >= 10) {
    tryUnlock("matches_10", eligible[9] ?? null);
  }
  if (matchesCount >= 25) {
    tryUnlock("matches_25", eligible[24] ?? null);
  }
  if (matchesCount >= 50) {
    tryUnlock("matches_50", eligible[49] ?? null);
  }
  if (matchesCount >= 100) {
    tryUnlock("matches_100", eligible[99] ?? null);
  }

  for (const [code, match] of streakUnlockMatches) {
    tryUnlock(code, match);
  }
  if (winAtOneHpMatch) {
    tryUnlock("win_one_hp", winAtOneHpMatch);
  }
  if (winAtThirtyHpMatch) {
    tryUnlock("win_thirty_hp", winAtThirtyHpMatch);
  }
  for (const [code, match] of underdogUnlockMatches) {
    tryUnlock(code, match, { deficit: bestUnderdogDeficit });
  }
  for (const [code, match] of heroWinUnlockMatches) {
    tryUnlock(code, match, { heroesWon: heroesWon.size });
  }
  if (allHeroesUnlockMatch) {
    tryUnlock("hero_wins_all", allHeroesUnlockMatch, {
      activeHeroCount: pInput.activeHeroIds.length,
    });
  }
  if (sameHeroUnlockMatch) {
    tryUnlock("same_hero_10", sameHeroUnlockMatch, { sameHeroMatches: bestSameHeroMatches });
  }
  if (comebackMatch) {
    tryUnlock("comeback_after_five_losses", comebackMatch);
  }
  for (const [code, match] of eloUnlockMatches) {
    tryUnlock(code, match, { elo: maxEloAfter });
  }

  const progress: AchievementProgress[] = ACHIEVEMENT_DEFINITIONS.map((pDef) =>
    buildProgress(pDef, {
      matchesCount,
      winsCount,
      bestWinStreak,
      heroesWon: heroesWon.size,
      bestSameHeroMatches,
      maxEloAfter,
      bestUnderdogDeficit,
      activeHeroCount: pInput.activeHeroIds.length,
    }),
  );

  return { newlyUnlocked, progress };
}

function buildProgress(
  pDef: AchievementDefinition,
  pStats: {
    matchesCount: number;
    winsCount: number;
    bestWinStreak: number;
    heroesWon: number;
    bestSameHeroMatches: number;
    maxEloAfter: number;
    bestUnderdogDeficit: number;
    activeHeroCount: number;
  },
): AchievementProgress {
  const target =
    pDef.code === "hero_wins_all"
      ? pStats.activeHeroCount
      : (pDef.progressTarget ?? null);

  let current = 0;
  switch (pDef.progressKind) {
    case "matches":
      current = pStats.matchesCount;
      break;
    case "wins":
      current = pStats.winsCount;
      break;
    case "winStreak":
      current = pStats.bestWinStreak;
      break;
    case "heroWins":
      current = pDef.code === "hero_wins_all" ? pStats.heroesWon : pStats.heroesWon;
      break;
    case "sameHeroMatches":
      current = pStats.bestSameHeroMatches;
      break;
    case "elo":
      current = roundRatingForDisplay(pStats.maxEloAfter);
      break;
    case "underdog":
      current = roundRatingForDisplay(pStats.bestUnderdogDeficit);
      break;
    default:
      current = 0;
  }

  return {
    code: pDef.code,
    current: target !== null ? Math.min(current, target) : current,
    target,
  };
}

/**
 * Full recompute of which codes should be owned (for admin cancel / rebuild).
 * Does not preserve unlock dates — caller merges with existing rows.
 */
export function computeOwnedAchievementCodes(pInput: EvaluateAchievementsInput): Set<string> {
  const result = evaluateAchievementsForPlayer({
    ...pInput,
    alreadyUnlocked: new Set(),
  });
  return new Set(result.newlyUnlocked.map((pItem) => pItem.code));
}
