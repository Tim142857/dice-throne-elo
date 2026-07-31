"use server";

import { revalidatePath } from "next/cache";

import { updateAutoValidateMatchesPreference } from "@/lib/account/preferences";
import { actionError, actionSuccess, type ActionResult } from "@/lib/actions/result";
import { getAuthContext } from "@/lib/auth/session";

export async function updateAutoValidateMatchesAction(
  pFormData: FormData,
): Promise<ActionResult<{ enabled: boolean }>> {
  const context = await getAuthContext();
  if (!context?.profile || context.profile.status !== "active") {
    return actionError("Compte actif requis.");
  }

  const enabled = String(pFormData.get("autoValidateMatches") || "") === "true";

  try {
    const profile = await updateAutoValidateMatchesPreference({
      actor: context.profile,
      enabled,
    });
    revalidatePath("/compte");
    return actionSuccess(
      { enabled: profile.autoValidateMatches },
      profile.autoValidateMatches
        ? "Validation automatique activée."
        : "Validation manuelle rétablie.",
    );
  } catch (pError) {
    return actionError(
      pError instanceof Error ? pError.message : "Impossible d’enregistrer la préférence.",
    );
  }
}
