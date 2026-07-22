export type HealthMatchFact = {
  matchId: string;
  validatedAt: string;
  winnerProfileId: string | null;
  winnerRemainingHealth: number;
  pvReliable: boolean;
};

export type PlayerHealthStats = {
  winsWithPv: number;
  averageWinnerHp: number | null;
  medianWinnerHp: number | null;
  closestWinHp: number | null;
  closestWinMatchId: string | null;
  largestWinHp: number | null;
  largestWinMatchId: string | null;
  winsWithAtMost5Hp: number;
  winsWithAtLeast20Hp: number;
};

export type ConfrontationHealthStats = {
  averageWinnerHpOverall: number | null;
  averageHpWhenAWins: number | null;
  averageHpWhenBWins: number | null;
  medianWinnerHp: number | null;
  closestWin: { winnerProfileId: string; hp: number; matchId: string } | null;
  largestWin: { winnerProfileId: string; hp: number; matchId: string } | null;
};

function median(pValues: number[]): number | null {
  if (pValues.length === 0) {
    return null;
  }
  const sorted = [...pValues].sort((pLeft, pRight) => pLeft - pRight);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

function average(pValues: number[]): number | null {
  if (pValues.length === 0) {
    return null;
  }
  return pValues.reduce((pSum, pValue) => pSum + pValue, 0) / pValues.length;
}

export function computePlayerHealthStats(
  pProfileId: string,
  pMatches: HealthMatchFact[],
): PlayerHealthStats {
  const wins = pMatches.filter(
    (pMatch) => pMatch.pvReliable && pMatch.winnerProfileId === pProfileId,
  );
  const hps = wins.map((pMatch) => pMatch.winnerRemainingHealth);
  let closest: HealthMatchFact | null = null;
  let largest: HealthMatchFact | null = null;
  for (const match of wins) {
    if (!closest || match.winnerRemainingHealth < closest.winnerRemainingHealth) {
      closest = match;
    }
    if (!largest || match.winnerRemainingHealth > largest.winnerRemainingHealth) {
      largest = match;
    }
  }

  return {
    winsWithPv: wins.length,
    averageWinnerHp: average(hps),
    medianWinnerHp: median(hps),
    closestWinHp: closest?.winnerRemainingHealth ?? null,
    closestWinMatchId: closest?.matchId ?? null,
    largestWinHp: largest?.winnerRemainingHealth ?? null,
    largestWinMatchId: largest?.matchId ?? null,
    winsWithAtMost5Hp: wins.filter((pMatch) => pMatch.winnerRemainingHealth <= 5).length,
    winsWithAtLeast20Hp: wins.filter((pMatch) => pMatch.winnerRemainingHealth >= 20).length,
  };
}

export function computeConfrontationHealthStats(
  pPlayerAId: string,
  pPlayerBId: string,
  pMatches: HealthMatchFact[],
): ConfrontationHealthStats {
  const reliable = pMatches.filter(
    (pMatch) => pMatch.pvReliable && pMatch.winnerProfileId !== null,
  );
  const hps = reliable.map((pMatch) => pMatch.winnerRemainingHealth);
  const aWins = reliable.filter((pMatch) => pMatch.winnerProfileId === pPlayerAId);
  const bWins = reliable.filter((pMatch) => pMatch.winnerProfileId === pPlayerBId);

  let closest: HealthMatchFact | null = null;
  let largest: HealthMatchFact | null = null;
  for (const match of reliable) {
    if (!closest || match.winnerRemainingHealth < closest.winnerRemainingHealth) {
      closest = match;
    }
    if (!largest || match.winnerRemainingHealth > largest.winnerRemainingHealth) {
      largest = match;
    }
  }

  return {
    averageWinnerHpOverall: average(hps),
    averageHpWhenAWins: average(aWins.map((pMatch) => pMatch.winnerRemainingHealth)),
    averageHpWhenBWins: average(bWins.map((pMatch) => pMatch.winnerRemainingHealth)),
    medianWinnerHp: median(hps),
    closestWin: closest
      ? {
          winnerProfileId: closest.winnerProfileId!,
          hp: closest.winnerRemainingHealth,
          matchId: closest.matchId,
        }
      : null,
    largestWin: largest
      ? {
          winnerProfileId: largest.winnerProfileId!,
          hp: largest.winnerRemainingHealth,
          matchId: largest.matchId,
        }
      : null,
  };
}

export function formatHpStat(pValue: number | null, pDigits = 1): string {
  if (pValue === null) {
    return "—";
  }
  return `${pValue.toLocaleString("fr-FR", {
    minimumFractionDigits: pDigits,
    maximumFractionDigits: pDigits,
  })} PV`;
}
