"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/result";
import { ensureAdminBootstrap } from "@/lib/auth/admin-bootstrap";
import { getAuthContext } from "@/lib/auth/session";
import {
  cancelValidatedMatchByAdmin,
  recomputeSeasonRatings,
  verifyRatingsConsistency,
  type ConsistencyReport,
  type RecomputeSummary,
} from "@/lib/matches/recompute-ratings";

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

function revalidateRankingPaths() {
  revalidatePath("/admin/maintenance");
  revalidatePath("/admin");
  revalidatePath("/classements");
  revalidatePath("/classements/joueurs-heros");
  revalidatePath("/matchs");
  revalidatePath("/mes-matchs");
}

export async function recomputeRatingsAction(): Promise<ActionResult<RecomputeSummary>> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    const summary = await recomputeSeasonRatings({
      adminProfile: admin.profile,
      reason: "manual",
    });
    revalidateRankingPaths();
    return actionSuccess(summary, "Recalcul terminé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec du recalcul.");
  }
}

export async function verifyRatingsConsistencyAction(): Promise<ActionResult<ConsistencyReport>> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    const report = await verifyRatingsConsistency();
    return actionSuccess(
      report,
      report.isConsistent
        ? "Les classements sont cohérents."
        : "Écart détecté entre la base et le recalcul attendu.",
    );
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la vérification.");
  }
}

export async function cancelValidatedMatchAction(
  pFormData: FormData,
): Promise<ActionResult<RecomputeSummary>> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  const matchId = String(pFormData.get("matchId") || "");
  const reasonRaw = String(pFormData.get("reason") || "").trim();

  try {
    const summary = await cancelValidatedMatchByAdmin({
      adminProfile: admin.profile,
      matchId,
      reason: reasonRaw.length > 0 ? reasonRaw : null,
    });
    revalidateRankingPaths();
    revalidatePath(`/matchs/${matchId}`);
    return actionSuccess(summary, "Match annulé et classements recalculés.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de l’annulation.");
  }
}
