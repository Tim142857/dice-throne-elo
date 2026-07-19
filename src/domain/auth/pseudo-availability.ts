import type { AccountStatus } from "@/types/domain";

export type PseudoAvailability =
  | { kind: "available" }
  | { kind: "claimablePreloaded"; profileId: string; pseudo: string }
  | { kind: "taken"; reason: string };

type ExistingProfile = {
  id: string;
  pseudo: string;
  status: AccountStatus;
};

type ExistingRequest = {
  id: string;
  status: "pending" | "approved" | "rejected";
};

/**
 * Decide whether a requested pseudo can be used for a new registration.
 */
export function evaluatePseudoAvailability(pInput: {
  existingProfile: ExistingProfile | null;
  existingPendingRequest: ExistingRequest | null;
}): PseudoAvailability {
  if (pInput.existingPendingRequest) {
    return {
      kind: "taken",
      reason: "Ce pseudo est déjà réservé par une demande d’inscription en cours.",
    };
  }

  if (!pInput.existingProfile) {
    return { kind: "available" };
  }

  if (pInput.existingProfile.status === "preloaded") {
    return {
      kind: "claimablePreloaded",
      profileId: pInput.existingProfile.id,
      pseudo: pInput.existingProfile.pseudo,
    };
  }

  return {
    kind: "taken",
    reason: "Ce pseudo est déjà utilisé. Choisissez-en un autre.",
  };
}

export function canCreateNewProfile(pAvailability: PseudoAvailability): boolean {
  return pAvailability.kind === "available";
}
