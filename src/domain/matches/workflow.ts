import type { MatchActionType } from "@/types/database";
import type { MatchStatus } from "@/types/domain";

export type MatchActorRole = "creator" | "opponent" | "admin";

const allowedTransitions: Array<{
  from: MatchStatus;
  to: MatchStatus;
  action: MatchActionType;
  actor: MatchActorRole;
}> = [
  {
    from: "pendingOpponent",
    to: "pendingOpponent",
    action: "updated",
    actor: "creator",
  },
  {
    from: "pendingOpponent",
    to: "cancelled",
    action: "cancelledByCreator",
    actor: "creator",
  },
  {
    from: "pendingOpponent",
    to: "validated",
    action: "validatedByOpponent",
    actor: "opponent",
  },
  {
    from: "pendingOpponent",
    to: "rejected",
    action: "rejectedByOpponent",
    actor: "opponent",
  },
  {
    from: "pendingOpponent",
    to: "pendingCreatorConfirmation",
    action: "correctionProposed",
    actor: "opponent",
  },
  {
    from: "pendingCreatorConfirmation",
    to: "validated",
    action: "correctionAccepted",
    actor: "creator",
  },
  {
    from: "pendingCreatorConfirmation",
    to: "disputed",
    action: "correctionRejected",
    actor: "creator",
  },
  {
    from: "pendingCreatorConfirmation",
    to: "cancelled",
    action: "cancelledByCreator",
    actor: "creator",
  },
  {
    from: "disputed",
    to: "validated",
    action: "resolvedByAdmin",
    actor: "admin",
  },
  {
    from: "disputed",
    to: "cancelledByAdmin",
    action: "cancelledByAdmin",
    actor: "admin",
  },
  {
    from: "pendingOpponent",
    to: "cancelledByAdmin",
    action: "cancelledByAdmin",
    actor: "admin",
  },
  {
    from: "pendingCreatorConfirmation",
    to: "cancelledByAdmin",
    action: "cancelledByAdmin",
    actor: "admin",
  },
  {
    from: "validated",
    to: "cancelledByAdmin",
    action: "cancelledByAdmin",
    actor: "admin",
  },
];

export function isTransitionAllowed(pInput: {
  from: MatchStatus;
  to: MatchStatus;
  action: MatchActionType;
  actor: MatchActorRole;
}): boolean {
  return allowedTransitions.some(
    (pRule) =>
      pRule.from === pInput.from &&
      pRule.to === pInput.to &&
      pRule.action === pInput.action &&
      pRule.actor === pInput.actor,
  );
}

export function assertTransitionAllowed(pInput: {
  from: MatchStatus;
  to: MatchStatus;
  action: MatchActionType;
  actor: MatchActorRole;
}): void {
  if (!isTransitionAllowed(pInput)) {
    throw new Error("Transition de statut non autorisée.");
  }
}

export function resolveActorRole(pInput: {
  actorProfileId: string;
  createdByProfileId: string;
  player1Id: string;
  player2Id: string;
  isAdmin: boolean;
}): MatchActorRole {
  if (pInput.isAdmin) {
    return "admin";
  }
  if (pInput.actorProfileId === pInput.createdByProfileId) {
    return "creator";
  }
  if (
    pInput.actorProfileId === pInput.player1Id ||
    pInput.actorProfileId === pInput.player2Id
  ) {
    return "opponent";
  }
  throw new Error("Vous n’êtes pas participant de ce match.");
}

export function getOpponentProfileId(pInput: {
  createdByProfileId: string;
  player1Id: string;
  player2Id: string;
}): string {
  return pInput.createdByProfileId === pInput.player1Id
    ? pInput.player2Id
    : pInput.player1Id;
}

export type DuplicateMatchFingerprint = {
  playedAt: string;
  player1Id: string;
  player2Id: string;
  hero1Id: string;
  hero2Id: string;
  winnerProfileId: string;
};

/**
 * Probable duplicate: same date, players, heroes and winner.
 * Player order is normalized so A vs B equals B vs A with swapped heroes.
 */
export function buildDuplicateFingerprint(pInput: DuplicateMatchFingerprint): string {
  const ordered =
    pInput.player1Id < pInput.player2Id
      ? {
          playerA: pInput.player1Id,
          heroA: pInput.hero1Id,
          playerB: pInput.player2Id,
          heroB: pInput.hero2Id,
        }
      : {
          playerA: pInput.player2Id,
          heroA: pInput.hero2Id,
          playerB: pInput.player1Id,
          heroB: pInput.hero1Id,
        };

  return [
    pInput.playedAt,
    ordered.playerA,
    ordered.heroA,
    ordered.playerB,
    ordered.heroB,
    pInput.winnerProfileId,
  ].join("|");
}

export function isProbableDuplicate(
  pLeft: DuplicateMatchFingerprint,
  pRight: DuplicateMatchFingerprint,
): boolean {
  return buildDuplicateFingerprint(pLeft) === buildDuplicateFingerprint(pRight);
}
