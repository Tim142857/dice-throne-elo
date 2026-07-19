import { SEED_IDS } from "@/types/database";
import type { AccountStatus } from "@/types/domain";

export type AdminApproveMode = "activateNewProfile" | "linkPreloadedProfile";

export type ApproveAccountDecision = {
  mode: AdminApproveMode;
  targetProfileId: string;
  shouldDeleteOrphanPendingProfile: boolean;
  orphanPendingProfileId: string | null;
};

/**
 * Build the approval plan for an account request.
 */
export function planAccountApproval(pInput: {
  requestLinkedProfileId: string | null;
  pendingProfileId: string | null;
  selectedPreloadedProfileId: string | null;
}): ApproveAccountDecision {
  if (pInput.selectedPreloadedProfileId) {
    return {
      mode: "linkPreloadedProfile",
      targetProfileId: pInput.selectedPreloadedProfileId,
      shouldDeleteOrphanPendingProfile: Boolean(pInput.pendingProfileId),
      orphanPendingProfileId: pInput.pendingProfileId,
    };
  }

  if (pInput.requestLinkedProfileId) {
    return {
      mode: "linkPreloadedProfile",
      targetProfileId: pInput.requestLinkedProfileId,
      shouldDeleteOrphanPendingProfile: Boolean(pInput.pendingProfileId),
      orphanPendingProfileId: pInput.pendingProfileId,
    };
  }

  if (!pInput.pendingProfileId) {
    throw new Error("Aucun profil à activer pour cette demande.");
  }

  return {
    mode: "activateNewProfile",
    targetProfileId: pInput.pendingProfileId,
    shouldDeleteOrphanPendingProfile: false,
    orphanPendingProfileId: null,
  };
}

export function nextStatusAfterReject(pCurrentStatus: AccountStatus | null): AccountStatus | null {
  if (pCurrentStatus === "pendingApproval") {
    return "rejected";
  }
  return pCurrentStatus;
}

export function isGlobalSeasonId(pSeasonId: string): boolean {
  return pSeasonId === SEED_IDS.globalSeasonId;
}
