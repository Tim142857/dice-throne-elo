"use server";

import { revalidatePath } from "next/cache";

import {
  approveAccountRequest,
  correctProfilePseudo,
  reactivateProfile,
  rejectAccountRequest,
  suspendProfile,
} from "@/lib/admin/account-admin";
import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/result";
import { ensureAdminBootstrap } from "@/lib/auth/admin-bootstrap";
import { getAuthContext } from "@/lib/auth/session";

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

export async function approveAccountRequestAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  const requestId = String(pFormData.get("requestId") || "");
  const selectedPreloadedProfileId = String(pFormData.get("selectedPreloadedProfileId") || "") || null;

  try {
    await approveAccountRequest({
      adminProfile: admin.profile,
      requestId,
      selectedPreloadedProfileId,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/inscriptions");
    revalidatePath("/admin/utilisateurs");
    return actionSuccess(undefined, "Demande approuvée.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de l’approbation.");
  }
}

export async function rejectAccountRequestAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  const requestId = String(pFormData.get("requestId") || "");
  const rejectionReasonRaw = String(pFormData.get("rejectionReason") || "").trim();
  const rejectionReason = rejectionReasonRaw.length > 0 ? rejectionReasonRaw : null;

  try {
    await rejectAccountRequest({
      adminProfile: admin.profile,
      requestId,
      rejectionReason,
    });
    revalidatePath("/admin");
    revalidatePath("/admin/inscriptions");
    return actionSuccess(undefined, "Demande refusée.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec du refus.");
  }
}

export async function suspendProfileAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    await suspendProfile({
      adminProfile: admin.profile,
      profileId: String(pFormData.get("profileId") || ""),
    });
    revalidatePath("/admin/utilisateurs");
    return actionSuccess(undefined, "Compte suspendu.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la suspension.");
  }
}

export async function reactivateProfileAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    await reactivateProfile({
      adminProfile: admin.profile,
      profileId: String(pFormData.get("profileId") || ""),
    });
    revalidatePath("/admin/utilisateurs");
    return actionSuccess(undefined, "Compte réactivé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la réactivation.");
  }
}

export async function correctPseudoAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    await correctProfilePseudo({
      adminProfile: admin.profile,
      profileId: String(pFormData.get("profileId") || ""),
      newPseudo: String(pFormData.get("newPseudo") || ""),
    });
    revalidatePath("/admin/utilisateurs");
    return actionSuccess(undefined, "Pseudo corrigé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la correction.");
  }
}
