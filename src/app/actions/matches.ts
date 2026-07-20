"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionSuccess, firstZodError, type ActionResult } from "@/lib/actions/result";
import { getAuthContext } from "@/lib/auth/session";
import {
  acceptMatchCorrection,
  cancelMatchByCreator,
  createMatch,
  proposeMatchCorrection,
  rejectMatchByOpponent,
  rejectMatchCorrection,
  updateMatchProposal,
  validateMatchByOpponent,
} from "@/lib/matches/match-service";
import { rejectMatchSchema } from "@/validation/match";

async function requireActiveActor() {
  const context = await getAuthContext();
  if (!context?.profile || context.profile.status !== "active") {
    return { ok: false as const, error: "Compte actif requis." };
  }
  return { ok: true as const, profile: context.profile };
}

function revalidateMatchPaths(pMatchId?: string) {
  revalidatePath("/mes-matchs");
  revalidatePath("/tableau-de-bord");
  revalidatePath("/matchs");
  revalidatePath("/classements");
  if (pMatchId) {
    revalidatePath(`/mes-matchs/${pMatchId}`);
  }
}

function readProposalFields(pFormData: FormData) {
  return {
    playedAt: String(pFormData.get("playedAt") || ""),
    player1Id: String(pFormData.get("player1Id") || ""),
    hero1Id: String(pFormData.get("hero1Id") || ""),
    player2Id: String(pFormData.get("player2Id") || ""),
    hero2Id: String(pFormData.get("hero2Id") || ""),
    winnerProfileId: String(pFormData.get("winnerProfileId") || ""),
    player1RemainingHealth: pFormData.get("player1RemainingHealth"),
    player2RemainingHealth: pFormData.get("player2RemainingHealth"),
    notes: String(pFormData.get("notes") || "") || undefined,
  };
}

export async function createMatchAction(
  pFormData: FormData,
): Promise<ActionResult<{ matchId: string; probableDuplicateIds: string[] }>> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const result = await createMatch({
      actor: actor.profile,
      fields: readProposalFields(pFormData),
    });
    revalidateMatchPaths(result.match.id);
    return actionSuccess(
      {
        matchId: result.match.id,
        probableDuplicateIds: result.probableDuplicateIds,
      },
      result.probableDuplicateIds.length > 0
        ? "Match déclaré. Attention : un doublon probable a été détecté."
        : "Match déclaré. En attente de validation par l’adversaire.",
    );
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la déclaration.");
  }
}

export async function updateMatchAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const matchId = String(pFormData.get("matchId") || "");
    await updateMatchProposal({
      actor: actor.profile,
      matchId,
      fields: readProposalFields(pFormData),
    });
    revalidateMatchPaths(matchId);
    return actionSuccess(undefined, "Proposition mise à jour.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la mise à jour.");
  }
}

export async function cancelMatchAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const matchId = String(pFormData.get("matchId") || "");
    await cancelMatchByCreator({ actor: actor.profile, matchId });
    revalidateMatchPaths(matchId);
    return actionSuccess(undefined, "Match annulé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de l’annulation.");
  }
}

export async function validateMatchAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const matchId = String(pFormData.get("matchId") || "");
    await validateMatchByOpponent({ actor: actor.profile, matchId });
    revalidateMatchPaths(matchId);
    return actionSuccess(undefined, "Match validé. Classements mis à jour.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la validation.");
  }
}

export async function rejectMatchAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  const parsed = rejectMatchSchema.safeParse({
    matchId: pFormData.get("matchId"),
    reason: pFormData.get("reason"),
  });
  if (!parsed.success) {
    return actionError(firstZodError(parsed.error));
  }

  try {
    await rejectMatchByOpponent({
      actor: actor.profile,
      matchId: parsed.data.matchId,
      reason: parsed.data.reason,
    });
    revalidateMatchPaths(parsed.data.matchId);
    return actionSuccess(undefined, "Match refusé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec du refus.");
  }
}

export async function proposeCorrectionAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const matchId = String(pFormData.get("matchId") || "");
    await proposeMatchCorrection({
      actor: actor.profile,
      matchId,
      fields: readProposalFields(pFormData),
    });
    revalidateMatchPaths(matchId);
    return actionSuccess(undefined, "Correction proposée.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la correction.");
  }
}

export async function acceptCorrectionAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const matchId = String(pFormData.get("matchId") || "");
    await acceptMatchCorrection({ actor: actor.profile, matchId });
    revalidateMatchPaths(matchId);
    return actionSuccess(undefined, "Correction acceptée. Match validé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de l’acceptation.");
  }
}

export async function rejectCorrectionAction(pFormData: FormData): Promise<ActionResult> {
  const actor = await requireActiveActor();
  if (!actor.ok) {
    return actionError(actor.error);
  }

  try {
    const matchId = String(pFormData.get("matchId") || "");
    await rejectMatchCorrection({ actor: actor.profile, matchId });
    revalidateMatchPaths(matchId);
    return actionSuccess(undefined, "Correction refusée. Match en litige.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec du refus de correction.");
  }
}
