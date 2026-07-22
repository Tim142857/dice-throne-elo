/**
 * Competition ranking (1224): equal values share a rank; next rank skips.
 */
export function assignCompetitionRanks<T>(
  pItems: T[],
  pGetSortKey: (pItem: T) => number,
): Array<T & { rank: number }> {
  let lastKey: number | null = null;
  let lastRank = 0;

  return pItems.map((pItem, pIndex) => {
    const key = pGetSortKey(pItem);
    const rank = lastKey !== null && key === lastKey ? lastRank : pIndex + 1;
    lastKey = key;
    lastRank = rank;
    return { ...pItem, rank };
  });
}

export function computeWinRate(pWins: number, pMatches: number): number | null {
  if (pMatches <= 0) {
    return null;
  }
  return pWins / pMatches;
}

export function formatWinRate(pWins: number, pMatches: number): string {
  const rate = computeWinRate(pWins, pMatches);
  if (rate === null) {
    return "—";
  }
  return `${Math.round(rate * 1000) / 10} %`;
}

/**
 * Rebuild the best win streak from an ordered list of results.
 * `null` = draw (breaks the streak, like a loss).
 */
export function computeBestWinStreak(pResultsChronological: Array<boolean | null>): number {
  let best = 0;
  let current = 0;
  for (const won of pResultsChronological) {
    current = won === true ? current + 1 : 0;
    best = Math.max(best, current);
  }
  return best;
}
