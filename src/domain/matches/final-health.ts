type MatchFinalHealthInput = {
  player1Id: string;
  player2Id: string;
  winnerProfileId: string | null;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
};

export function formatMatchFinalHealthScore(
  pPlayer1Health: number,
  pPlayer2Health: number,
): string {
  return `${pPlayer1Health} - ${pPlayer2Health}`;
}

/**
 * Outcome is fully determined by remaining HP:
 * higher HP wins; equal HP (including 0-0) is a draw.
 */
export function resolveWinnerProfileIdFromHealth(pInput: {
  player1Id: string;
  player2Id: string;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
}): string | null {
  if (pInput.player1RemainingHealth === pInput.player2RemainingHealth) {
    return null;
  }
  return pInput.player1RemainingHealth > pInput.player2RemainingHealth
    ? pInput.player1Id
    : pInput.player2Id;
}

export function describeMatchOutcomeFromHealth(pInput: {
  player1Id: string;
  player2Id: string;
  player1Label: string;
  player2Label: string;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
}): string {
  const winnerId = resolveWinnerProfileIdFromHealth(pInput);
  if (winnerId === null) {
    return "Match nul";
  }
  return winnerId === pInput.player1Id
    ? `Victoire — ${pInput.player1Label}`
    : `Victoire — ${pInput.player2Label}`;
}

export function getWinnerRemainingHealthFromFinalHealth(pInput: {
  player1Id: string;
  winnerProfileId: string | null;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
}): number {
  if (pInput.winnerProfileId === null) {
    return pInput.player1RemainingHealth;
  }
  return pInput.winnerProfileId === pInput.player1Id
    ? pInput.player1RemainingHealth
    : pInput.player2RemainingHealth;
}

/**
 * Remaining health alone defines the outcome; no extra consistency checks.
 */
export function validateMatchFinalHealth(_pInput: MatchFinalHealthInput): string | null {
  return null;
}
