import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProfileRow } from "@/types/database";

export async function writeAuditLog(pInput: {
  actorProfileId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData?: Record<string, unknown> | null;
  afterData?: Record<string, unknown> | null;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("audit_logs").insert({
    actor_profile_id: pInput.actorProfileId,
    action: pInput.action,
    entity_type: pInput.entityType,
    entity_id: pInput.entityId,
    before_data: pInput.beforeData ?? null,
    after_data: pInput.afterData ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function createNotification(pInput: {
  recipientProfileId: string;
  type:
    | "accountApproved"
    | "accountRejected"
    | "matchPendingValidation"
    | "matchValidated"
    | "matchRejected"
    | "correctionProposed"
    | "correctionAccepted"
    | "correctionRejected"
    | "matchDisputed"
    | "adminDecision"
    | "achievementUnlocked";
  title: string;
  message: string;
  relatedMatchId?: string | null;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("notifications").insert({
    recipient_profile_id: pInput.recipientProfileId,
    type: pInput.type,
    title: pInput.title,
    message: pInput.message,
    related_match_id: pInput.relatedMatchId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export function assertAdminProfile(pProfile: ProfileRow | null): asserts pProfile is ProfileRow {
  if (!pProfile || pProfile.role !== "admin" || pProfile.status !== "active") {
    throw new Error("Accès administrateur requis.");
  }
}
