"use server";

import { revalidatePath } from "next/cache";

import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/result";
import { createHero, setHeroActive, updateHero } from "@/lib/admin/hero-admin";
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

function revalidateHeroPaths() {
  revalidatePath("/admin/heros");
  revalidatePath("/heros");
  revalidatePath("/admin");
}

export async function createHeroAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    await createHero({
      adminProfile: admin.profile,
      name: String(pFormData.get("name") || ""),
      isActive: pFormData.get("isActive") === "true",
    });
    revalidateHeroPaths();
    return actionSuccess(undefined, "Héros créé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la création.");
  }
}

export async function updateHeroAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    await updateHero({
      adminProfile: admin.profile,
      heroId: String(pFormData.get("heroId") || ""),
      name: String(pFormData.get("name") || ""),
      isActive: pFormData.get("isActive") === "true",
    });
    revalidateHeroPaths();
    return actionSuccess(undefined, "Héros mis à jour.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec de la mise à jour.");
  }
}

export async function setHeroActiveAction(pFormData: FormData): Promise<ActionResult> {
  const admin = await requireAdminProfile();
  if (!admin.ok) {
    return actionError(admin.error);
  }

  try {
    const isActive = String(pFormData.get("isActive") || "") === "true";
    await setHeroActive({
      adminProfile: admin.profile,
      heroId: String(pFormData.get("heroId") || ""),
      isActive,
    });
    revalidateHeroPaths();
    return actionSuccess(undefined, isActive ? "Héros activé." : "Héros désactivé.");
  } catch (pError) {
    return actionError(pError instanceof Error ? pError.message : "Échec du changement de statut.");
  }
}
