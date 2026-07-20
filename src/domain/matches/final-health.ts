type MatchFinalHealthInput = {
  player1Id: string;
  player2Id: string;
  winnerProfileId: string;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
};

export function formatMatchFinalHealthScore(
  pPlayer1Health: number,
  pPlayer2Health: number,
): string {
  return `${pPlayer1Health} - ${pPlayer2Health}`;
}

export function getWinnerRemainingHealthFromFinalHealth(pInput: {
  player1Id: string;
  winnerProfileId: string;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
}): number {
  return pInput.winnerProfileId === pInput.player1Id
    ? pInput.player1RemainingHealth
    : pInput.player2RemainingHealth;
}

export function validateMatchFinalHealth(pInput: MatchFinalHealthInput): string | null {
  const { player1RemainingHealth, player2RemainingHealth, winnerProfileId, player1Id } = pInput;

  if (player1RemainingHealth === 0 && player2RemainingHealth === 0) {
    return "Les deux joueurs ne peuvent pas être à 0 PV.";
  }

  const winnerIsPlayer1 = winnerProfileId === player1Id;
  const winnerHealth = winnerIsPlayer1 ? player1RemainingHealth : player2RemainingHealth;
  const loserHealth = winnerIsPlayer1 ? player2RemainingHealth : player1RemainingHealth;

  if (loserHealth === 0) {
    return winnerHealth > 0 ? null : "Le vainqueur doit avoir des PV restants en cas de KO.";
  }

  if (winnerHealth <= loserHealth) {
    return "Le vainqueur doit avoir strictement plus de PV que l’adversaire.";
  }

  return null;
}
