import { writeAuditLog } from "@/lib/admin/audit";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

export async function updateAutoValidateMatchesPreference(pInput: {
  actor: ProfileRow;
  enabled: boolean;
}): Promise<ProfileRow> {
  if (pInput.actor.status !== "active") {
    throw new Error("Compte actif requis.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({ auto_validate_matches: pInput.enabled })
    .eq("id", pInput.actor.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible d’enregistrer la préférence.");
  }

  const profile = mapProfileRow(data as ProfileDbRow);
  await writeAuditLog({
    actorProfileId: pInput.actor.id,
    action: "profile.auto_validate_matches_updated",
    entityType: "profile",
    entityId: pInput.actor.id,
    beforeData: { autoValidateMatches: pInput.actor.autoValidateMatches },
    afterData: { autoValidateMatches: profile.autoValidateMatches },
  });

  return profile;
}
