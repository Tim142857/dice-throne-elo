import type { User } from "@supabase/supabase-js";

import {
  canCreateNewProfile,
  evaluatePseudoAvailability,
} from "@/domain/auth/pseudo-availability";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/text";
import { normalizePseudo } from "@/validation/pseudo";
import type { AccountRequestDbRow, ProfileDbRow } from "@/lib/mappers/account";
import { mapAccountRequestRow, mapProfileRow } from "@/lib/mappers/account";
import type { AccountRequestRow, ProfileRow } from "@/types/database";

export type ProvisionResult =
  | {
      status: "provisioned";
      profile: ProfileRow | null;
      accountRequest: AccountRequestRow;
      claimablePreloaded: boolean;
    }
  | { status: "waitingEmailVerification" }
  | { status: "needsPseudo" }
  | { status: "alreadyProvisioned"; profile: ProfileRow | null; accountRequest: AccountRequestRow }
  | { status: "error"; message: string };

function readRequestedPseudo(pUser: User): string | null {
  const raw = pUser.user_metadata?.requested_pseudo;
  return typeof raw === "string" && raw.trim().length > 0 ? raw.trim() : null;
}

function readPresentationMessage(pUser: User): string | null {
  const raw = pUser.user_metadata?.presentation_message;
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isEmailVerified(pUser: User): boolean {
  return Boolean(pUser.email_confirmed_at);
}

export async function provisionAccountForUser(pUser: User): Promise<ProvisionResult> {
  if (!isEmailVerified(pUser)) {
    return { status: "waitingEmailVerification" };
  }

  const admin = createSupabaseAdminClient();

  const existingRequestResponse = await admin
    .from("account_requests")
    .select("*")
    .eq("auth_user_id", pUser.id)
    .maybeSingle();

  if (existingRequestResponse.error) {
    return { status: "error", message: existingRequestResponse.error.message };
  }

  const existingProfileResponse = await admin
    .from("profiles")
    .select("*")
    .eq("auth_user_id", pUser.id)
    .maybeSingle();

  if (existingProfileResponse.error) {
    return { status: "error", message: existingProfileResponse.error.message };
  }

  if (existingRequestResponse.data) {
    return {
      status: "alreadyProvisioned",
      profile: existingProfileResponse.data
        ? mapProfileRow(existingProfileResponse.data as ProfileDbRow)
        : null,
      accountRequest: mapAccountRequestRow(existingRequestResponse.data as AccountRequestDbRow),
    };
  }

  const requestedPseudo = readRequestedPseudo(pUser);
  if (!requestedPseudo) {
    return { status: "needsPseudo" };
  }

  const normalized = normalizePseudo(requestedPseudo);

  const profileByPseudoResponse = await admin
    .from("profiles")
    .select("id, pseudo, status")
    .eq("normalized_pseudo", normalized)
    .maybeSingle();

  if (profileByPseudoResponse.error) {
    return { status: "error", message: profileByPseudoResponse.error.message };
  }

  const pendingRequestResponse = await admin
    .from("account_requests")
    .select("id, status")
    .eq("normalized_pseudo", normalized)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRequestResponse.error) {
    return { status: "error", message: pendingRequestResponse.error.message };
  }

  const availability = evaluatePseudoAvailability({
    existingProfile: profileByPseudoResponse.data
      ? {
          id: profileByPseudoResponse.data.id as string,
          pseudo: profileByPseudoResponse.data.pseudo as string,
          status: profileByPseudoResponse.data.status as ProfileRow["status"],
        }
      : null,
    existingPendingRequest: pendingRequestResponse.data
      ? {
          id: pendingRequestResponse.data.id as string,
          status: pendingRequestResponse.data.status as "pending",
        }
      : null,
  });

  if (availability.kind === "taken") {
    return { status: "error", message: availability.reason };
  }

  let createdProfile: ProfileRow | null = null;

  if (canCreateNewProfile(availability)) {
    const slugBase = slugify(requestedPseudo);
    const insertProfileResponse = await admin
      .from("profiles")
      .insert({
        auth_user_id: pUser.id,
        pseudo: requestedPseudo,
        normalized_pseudo: normalized,
        slug: slugBase,
        status: "pendingApproval",
        role: "player",
      })
      .select("*")
      .single();

    if (insertProfileResponse.error) {
      return { status: "error", message: insertProfileResponse.error.message };
    }

    createdProfile = mapProfileRow(insertProfileResponse.data as ProfileDbRow);
  }

  const insertRequestResponse = await admin
    .from("account_requests")
    .insert({
      auth_user_id: pUser.id,
      requested_pseudo: requestedPseudo,
      normalized_pseudo: normalized,
      presentation_message: readPresentationMessage(pUser),
      status: "pending",
      linked_profile_id: availability.kind === "claimablePreloaded" ? availability.profileId : null,
    })
    .select("*")
    .single();

  if (insertRequestResponse.error) {
    return { status: "error", message: insertRequestResponse.error.message };
  }

  return {
    status: "provisioned",
    profile: createdProfile,
    accountRequest: mapAccountRequestRow(insertRequestResponse.data as AccountRequestDbRow),
    claimablePreloaded: availability.kind === "claimablePreloaded",
  };
}
