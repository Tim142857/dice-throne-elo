export type RecordMatchFact = {
  matchId: string;
  validatedAt: string;
  playedAt: string;
  player1Id: string;
  player2Id: string;
  hero1Id: string;
  hero2Id: string;
  winnerProfileId: string;
  /** Winner remaining HP — required for PV records. */
  winnerRemainingHealth: number | null;
  /** True when PV data is reliable enough for PV records. */
  pvReliable: boolean;
  player1EloBefore: number | null;
  player2EloBefore: number | null;
  player1EloAfter: number | null;
  player2EloAfter: number | null;
  player1EloChange: number | null;
  player2EloChange: number | null;
};

export type RecordHolder = {
  profileId: string | null;
  relatedProfileIds: string[];
  value: number;
  relatedMatchId: string | null;
  establishedAt: string;
};

export type ComputedRecord = {
  code: string;
  title: string;
  subtitle: string;
  holders: RecordHolder[];
};

export const RECORD_DEFINITIONS = [
  {
    code: "highest_elo",
    title: "Patron du serveur",
    subtitle: "Meilleur Elo général historique atteint",
  },
  {
    code: "longest_win_streak",
    title: "Train sans frein",
    subtitle: "Plus longue série de victoires validées",
  },
  {
    code: "most_matches",
    title: "CDI sur le ladder",
    subtitle: "Plus grand nombre de matchs validés",
  },
  {
    code: "most_wins",
    title: "Tableau de chasse",
    subtitle: "Plus grand nombre de victoires validées",
  },
  {
    code: "most_unique_heroes",
    title: "Collectionneur compulsif",
    subtitle: "Plus grand nombre de héros différents joués",
  },
  {
    code: "most_opponents_beaten",
    title: "Prédateur social",
    subtitle: "Plus grand nombre d’adversaires différents battus",
  },
  {
    code: "closest_win",
    title: "Chirurgien du 1 PV",
    subtitle: "Victoire avec le moins de PV restants",
  },
  {
    code: "largest_win",
    title: "Passage du rouleau compresseur",
    subtitle: "Victoire avec le plus de PV restants",
  },
  {
    code: "biggest_upset",
    title: "Le script n’avait pas prévu ça",
    subtitle: "Victoire avec le plus grand déficit Elo avant le match",
  },
  {
    code: "most_frequent_rivalry",
    title: "Vous voulez qu’on vous laisse seuls ?",
    subtitle: "Paire de joueurs ayant disputé le plus de matchs",
  },
  {
    code: "best_ten_match_progression",
    title: "Montée en puissance",
    subtitle: "Plus forte progression Elo sur 10 matchs validés consécutifs",
  },
  {
    code: "largest_single_elo_gain",
    title: "Braquage de points",
    subtitle: "Plus grand gain Elo général sur un match",
  },
] as const;

function rivalryKey(pA: string, pB: string): string {
  return pA < pB ? `${pA}|${pB}` : `${pB}|${pA}`;
}

function pushMaxHolders(
  pMap: Map<string, RecordHolder[]>,
  pCode: string,
  pCandidate: RecordHolder,
  pPreferLower = false,
): void {
  const existing = pMap.get(pCode) ?? [];
  if (existing.length === 0) {
    pMap.set(pCode, [pCandidate]);
    return;
  }
  const current = existing[0]!.value;
  const better = pPreferLower ? pCandidate.value < current : pCandidate.value > current;
  const equal = pCandidate.value === current;
  if (better) {
    pMap.set(pCode, [pCandidate]);
  } else if (equal) {
    const duplicate = existing.some(
      (pHolder) =>
        pHolder.profileId === pCandidate.profileId &&
        pHolder.relatedMatchId === pCandidate.relatedMatchId &&
        [...pHolder.relatedProfileIds].sort().join() ===
          [...pCandidate.relatedProfileIds].sort().join(),
    );
    if (!duplicate) {
      pMap.set(pCode, [...existing, pCandidate]);
    }
  }
}

/**
 * Compute all V1 records from validated match facts (including historical).
 */
export function computeRecords(pMatches: RecordMatchFact[]): ComputedRecord[] {
  const ordered = [...pMatches].sort((pLeft, pRight) =>
    pLeft.validatedAt.localeCompare(pRight.validatedAt),
  );

  const holders = new Map<string, RecordHolder[]>();

  const matchCounts = new Map<string, number>();
  const winCounts = new Map<string, number>();
  const heroesPlayed = new Map<string, Set<string>>();
  const opponentsBeaten = new Map<string, Set<string>>();
  const winStreak = new Map<string, number>();
  const bestWinStreak = new Map<string, { value: number; matchId: string; at: string }>();
  const highestElo = new Map<string, { value: number; matchId: string; at: string }>();
  const rivalryCounts = new Map<string, { count: number; lastMatchId: string; at: string; a: string; b: string }>();
  const eloSeries = new Map<string, Array<{ after: number; matchId: string; at: string }>>();

  for (const match of ordered) {
    for (const profileId of [match.player1Id, match.player2Id]) {
      matchCounts.set(profileId, (matchCounts.get(profileId) ?? 0) + 1);
      const heroes = heroesPlayed.get(profileId) ?? new Set<string>();
      heroes.add(profileId === match.player1Id ? match.hero1Id : match.hero2Id);
      heroesPlayed.set(profileId, heroes);
    }

    const key = rivalryKey(match.player1Id, match.player2Id);
    const rivalry = rivalryCounts.get(key) ?? {
      count: 0,
      lastMatchId: match.matchId,
      at: match.validatedAt,
      a: match.player1Id,
      b: match.player2Id,
    };
    rivalry.count += 1;
    rivalry.lastMatchId = match.matchId;
    rivalry.at = match.validatedAt;
    rivalryCounts.set(key, rivalry);

    const winnerId = match.winnerProfileId;
    const loserId = winnerId === match.player1Id ? match.player2Id : match.player1Id;
    winCounts.set(winnerId, (winCounts.get(winnerId) ?? 0) + 1);
    const beaten = opponentsBeaten.get(winnerId) ?? new Set<string>();
    beaten.add(loserId);
    opponentsBeaten.set(winnerId, beaten);

    const streak = (winStreak.get(winnerId) ?? 0) + 1;
    winStreak.set(winnerId, streak);
    winStreak.set(loserId, 0);
    const best = bestWinStreak.get(winnerId);
    if (!best || streak > best.value) {
      bestWinStreak.set(winnerId, {
        value: streak,
        matchId: match.matchId,
        at: match.validatedAt,
      });
    }

    for (const [profileId, after] of [
      [match.player1Id, match.player1EloAfter] as const,
      [match.player2Id, match.player2EloAfter] as const,
    ]) {
      if (after === null) {
        continue;
      }
      const current = highestElo.get(profileId);
      if (!current || after > current.value) {
        highestElo.set(profileId, {
          value: after,
          matchId: match.matchId,
          at: match.validatedAt,
        });
      }
      const series = eloSeries.get(profileId) ?? [];
      series.push({ after, matchId: match.matchId, at: match.validatedAt });
      eloSeries.set(profileId, series);
    }

    if (match.pvReliable && match.winnerRemainingHealth !== null) {
      pushMaxHolders(
        holders,
        "closest_win",
        {
          profileId: winnerId,
          relatedProfileIds: [winnerId],
          value: match.winnerRemainingHealth,
          relatedMatchId: match.matchId,
          establishedAt: match.validatedAt,
        },
        true,
      );
      pushMaxHolders(holders, "largest_win", {
        profileId: winnerId,
        relatedProfileIds: [winnerId],
        value: match.winnerRemainingHealth,
        relatedMatchId: match.matchId,
        establishedAt: match.validatedAt,
      });
    }

    const winnerBefore =
      winnerId === match.player1Id ? match.player1EloBefore : match.player2EloBefore;
    const loserBefore =
      winnerId === match.player1Id ? match.player2EloBefore : match.player1EloBefore;
    if (winnerBefore !== null && loserBefore !== null) {
      const deficit = loserBefore - winnerBefore;
      if (deficit > 0) {
        pushMaxHolders(holders, "biggest_upset", {
          profileId: winnerId,
          relatedProfileIds: [winnerId],
          value: deficit,
          relatedMatchId: match.matchId,
          establishedAt: match.validatedAt,
        });
      }
    }

    for (const [profileId, change] of [
      [match.player1Id, match.player1EloChange] as const,
      [match.player2Id, match.player2EloChange] as const,
    ]) {
      if (change !== null && change > 0) {
        pushMaxHolders(holders, "largest_single_elo_gain", {
          profileId,
          relatedProfileIds: [profileId],
          value: change,
          relatedMatchId: match.matchId,
          establishedAt: match.validatedAt,
        });
      }
    }
  }

  for (const [profileId, value] of matchCounts) {
    pushMaxHolders(holders, "most_matches", {
      profileId,
      relatedProfileIds: [profileId],
      value,
      relatedMatchId: null,
      establishedAt: ordered[ordered.length - 1]?.validatedAt ?? "",
    });
  }
  for (const [profileId, value] of winCounts) {
    pushMaxHolders(holders, "most_wins", {
      profileId,
      relatedProfileIds: [profileId],
      value,
      relatedMatchId: null,
      establishedAt: ordered[ordered.length - 1]?.validatedAt ?? "",
    });
  }
  for (const [profileId, heroes] of heroesPlayed) {
    pushMaxHolders(holders, "most_unique_heroes", {
      profileId,
      relatedProfileIds: [profileId],
      value: heroes.size,
      relatedMatchId: null,
      establishedAt: ordered[ordered.length - 1]?.validatedAt ?? "",
    });
  }
  for (const [profileId, opponents] of opponentsBeaten) {
    pushMaxHolders(holders, "most_opponents_beaten", {
      profileId,
      relatedProfileIds: [profileId],
      value: opponents.size,
      relatedMatchId: null,
      establishedAt: ordered[ordered.length - 1]?.validatedAt ?? "",
    });
  }
  for (const [profileId, best] of bestWinStreak) {
    pushMaxHolders(holders, "longest_win_streak", {
      profileId,
      relatedProfileIds: [profileId],
      value: best.value,
      relatedMatchId: best.matchId,
      establishedAt: best.at,
    });
  }
  for (const [profileId, best] of highestElo) {
    pushMaxHolders(holders, "highest_elo", {
      profileId,
      relatedProfileIds: [profileId],
      value: best.value,
      relatedMatchId: best.matchId,
      establishedAt: best.at,
    });
  }
  for (const rivalry of rivalryCounts.values()) {
    pushMaxHolders(holders, "most_frequent_rivalry", {
      profileId: null,
      relatedProfileIds: [rivalry.a, rivalry.b],
      value: rivalry.count,
      relatedMatchId: rivalry.lastMatchId,
      establishedAt: rivalry.at,
    });
  }

  for (const [profileId, series] of eloSeries) {
    if (series.length < 10) {
      continue;
    }
    for (let index = 9; index < series.length; index += 1) {
      const start = series[index - 9]!;
      const end = series[index]!;
      // Progression over 10 consecutive matches: elo after 10th minus elo after (or before) first of window.
      // Use delta from the rating after the match just before the window when available.
      const beforeWindow = index >= 10 ? series[index - 10]!.after : start.after;
      const progression =
        index >= 10 ? end.after - beforeWindow : end.after - start.after;
      // Better: elo after match N+9 minus elo before match N approximated by after of N-1
      const value = end.after - (index >= 10 ? series[index - 10]!.after : series[0]!.after);
      pushMaxHolders(holders, "best_ten_match_progression", {
        profileId,
        relatedProfileIds: [profileId],
        value,
        relatedMatchId: end.matchId,
        establishedAt: end.at,
      });
      void progression;
    }
  }

  return RECORD_DEFINITIONS.map((pDef) => ({
    code: pDef.code,
    title: pDef.title,
    subtitle: pDef.subtitle,
    holders: holders.get(pDef.code) ?? [],
  }));
}
