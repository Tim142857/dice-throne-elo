"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/result";
import { ensureAdminBootstrap } from "@/lib/auth/admin-bootstrap";
import { getAuthContext } from "@/lib/auth/session";
import {
  cancelDisputedMatchByAdmin,
  resolveDisputedMatchByAdmin,
} from "@/lib/matches/match-service";

async function requireAdminProfile() {
  const context = await getAuthContext();
  if (!context) {
    return { ok: false as const, error: "Authentification requise." };
  }
  await ensureAdminBootstrap(context.user);
  const refreshed = await getAuthContext();
  if (!refreshed?.profile || refreshed.profile.role !== "admin" || refreshed.profile.status !== "active") {
    return { ok: false as const, error: "Accès administrateur requis." };
  }
  return { ok: true as const, profile: refreshed.profile };
}

function revalidateDisputePaths(pMatchId: string) {
  revalidatePath("/admin/litiges");
  revalidatePath("/admin");
  revalidatePath("/mes-matchs");
  revalidatePath(`/mes-matchs/${pMatchId}`);
  revalidatePath("/matchs");
  revalidatePath("/classements");
  revalidatePath("/notifications");
}

export async function resolveDisputeKeepProposalAction(
  pFormData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  const matchId = String(pFormData.get("matchId") || "");
  const proposalId = String(pFormData.get("proposalId") || "");
  const reasonRaw = String(pFormData.get("reason") || "").trim();

  try {
    await resolveDisputedMatchByAdmin({
      admin: admin.profile,
      matchId,
      mode: "keepProposal",
      proposalId,
      reason: reasonRaw.length > 0 ? reasonRaw : null,
    });
    revalidateDisputePaths(matchId);
    return actionSuccess(undefined, "Litige tranché : proposition validée.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la résolution.");
  }
}

export async function resolveDisputeCustomAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  const matchId = String(pFormData.get("matchId") || "");
  const reasonRaw = String(pFormData.get("reason") || "").trim();

  try {
    await resolveDisputedMatchByAdmin({
      admin: admin.profile,
      matchId,
      mode: "custom",
      fields: {
        playedAt: String(pFormData.get("playedAt") || ""),
        player1Id: String(pFormData.get("player1Id") || ""),
        hero1Id: String(pFormData.get("hero1Id") || ""),
        player2Id: String(pFormData.get("player2Id") || ""),
        hero2Id: String(pFormData.get("hero2Id") || ""),
        winnerProfileId: String(pFormData.get("winnerProfileId") || ""),
        player1RemainingHealth: pFormData.get("player1RemainingHealth"),
        player2RemainingHealth: pFormData.get("player2RemainingHealth"),
        notes: String(pFormData.get("notes") || "") || undefined,
      },
      reason: reasonRaw.length > 0 ? reasonRaw : null,
    });
    revalidateDisputePaths(matchId);
    return actionSuccess(undefined, "Litige tranché : décision admin enregistrée.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la résolution.");
  }
}

export async function cancelDisputeAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  const matchId = String(pFormData.get("matchId") || "");
  const reasonRaw = String(pFormData.get("reason") || "").trim();

  try {
    await cancelDisputedMatchByAdmin({
      admin: admin.profile,
      matchId,
      reason: reasonRaw.length > 0 ? reasonRaw : null,
    });
    revalidateDisputePaths(matchId);
    return actionSuccess(undefined, "Match annulé définitivement.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de l’annulation.");
  }
}
