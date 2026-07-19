import {
  nextStatusAfterReject,
  planAccountApproval,
} from "@/domain/admin/account-review";
import { assertAdminProfile, createNotification, writeAuditLog } from "@/lib/admin/audit";
import {
  mapAccountRequestRow,
  mapProfileRow,
  type AccountRequestDbRow,
  type ProfileDbRow,
} from "@/lib/mappers/account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/text";
import { SEED_IDS, type AccountRequestRow, type ProfileRow } from "@/types/database";
import { normalizePseudo, pseudoSchema } from "@/validation/pseudo";

async function ensurePlayerRating(pProfileId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("player_ratings").upsert(
    {
      profile_id: pProfileId,
      season_id: SEED_IDS.globalSeasonId,
      rating: 1000,
      best_rating: 1000,
    },
    { onConflict: "profile_id,season_id", ignoreDuplicates: true },
  );
  if (error) {
    throw new Error(error.message);
  }
}

export async function listPendingAccountRequests(): Promise<
  Array<{
    request: AccountRequestRow;
    applicantProfile: ProfileRow | null;
    suggestedPreloaded: ProfileRow | null;
  }>
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("account_requests")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as AccountRequestDbRow[];
  const results = [];

  for (const row of rows) {
    const request = mapAccountRequestRow(row);
    const [applicantResponse, suggestedResponse] = await Promise.all([
      admin.from("profiles").select("*").eq("auth_user_id", request.authUserId).maybeSingle(),
      request.linkedProfileId
        ? admin.from("profiles").select("*").eq("id", request.linkedProfileId).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (applicantResponse.error) {
      throw new Error(applicantResponse.error.message);
    }
    if (suggestedResponse.error) {
      throw new Error(suggestedResponse.error.message);
    }

    results.push({
      request,
      applicantProfile: applicantResponse.data
        ? mapProfileRow(applicantResponse.data as ProfileDbRow)
        : null,
      suggestedPreloaded: suggestedResponse.data
        ? mapProfileRow(suggestedResponse.data as ProfileDbRow)
        : null,
    });
  }

  return results;
}

export async function listPreloadedProfiles(): Promise<ProfileRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("status", "preloaded")
    .order("pseudo", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileDbRow[]).map(mapProfileRow);
}

export async function listManagedUsers(): Promise<ProfileRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .in("status", ["active", "suspended", "pendingApproval", "rejected"])
    .order("pseudo", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileDbRow[]).map(mapProfileRow);
}

export async function approveAccountRequest(pInput: {
  adminProfile: ProfileRow;
  requestId: string;
  selectedPreloadedProfileId: string | null;
}): Promise<void> {
  assertAdminProfile(pInput.adminProfile);
  const admin = createSupabaseAdminClient();

  const requestResponse = await admin
    .from("account_requests")
    .select("*")
    .eq("id", pInput.requestId)
    .single();

  if (requestResponse.error || !requestResponse.data) {
    throw new Error("Demande introuvable.");
  }

  const request = mapAccountRequestRow(requestResponse.data as AccountRequestDbRow);
  if (request.status !== "pending") {
    throw new Error("Cette demande a déjà été traitée.");
  }

  const applicantProfileResponse = await admin
    .from("profiles")
    .select("*")
    .eq("auth_user_id", request.authUserId)
    .maybeSingle();

  if (applicantProfileResponse.error) {
    throw new Error(applicantProfileResponse.error.message);
  }

  const pendingProfile = applicantProfileResponse.data
    ? mapProfileRow(applicantProfileResponse.data as ProfileDbRow)
    : null;

  const decision = planAccountApproval({
    requestLinkedProfileId: request.linkedProfileId,
    pendingProfileId: pendingProfile?.id ?? null,
    selectedPreloadedProfileId: pInput.selectedPreloadedProfileId,
  });

  if (decision.mode === "linkPreloadedProfile") {
    const targetResponse = await admin
      .from("profiles")
      .select("*")
      .eq("id", decision.targetProfileId)
      .single();

    if (targetResponse.error || !targetResponse.data) {
      throw new Error("Profil historique introuvable.");
    }

    const target = mapProfileRow(targetResponse.data as ProfileDbRow);
    if (target.status !== "preloaded" && target.authUserId !== request.authUserId) {
      throw new Error("Le profil sélectionné n’est pas disponible pour liaison.");
    }

    const { error: linkError } = await admin
      .from("profiles")
      .update({
        auth_user_id: request.authUserId,
        status: "active",
        approved_at: new Date().toISOString(),
        suspended_at: null,
      })
      .eq("id", target.id);

    if (linkError) {
      throw new Error(linkError.message);
    }

    if (decision.shouldDeleteOrphanPendingProfile && decision.orphanPendingProfileId) {
      const { error: deleteError } = await admin
        .from("profiles")
        .delete()
        .eq("id", decision.orphanPendingProfileId)
        .eq("status", "pendingApproval");
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    }

    await ensurePlayerRating(target.id);
    await createNotification({
      recipientProfileId: target.id,
      type: "accountApproved",
      title: "Compte approuvé",
      message: "Votre compte a été validé et relié à votre profil historique.",
    });
  } else {
    const { error: activateError } = await admin
      .from("profiles")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        suspended_at: null,
      })
      .eq("id", decision.targetProfileId);

    if (activateError) {
      throw new Error(activateError.message);
    }

    await ensurePlayerRating(decision.targetProfileId);
    await createNotification({
      recipientProfileId: decision.targetProfileId,
      type: "accountApproved",
      title: "Compte approuvé",
      message: "Votre compte a été validé. Vous pouvez désormais déclarer des matchs.",
    });
  }

  const { error: requestError } = await admin
    .from("account_requests")
    .update({
      status: "approved",
      reviewed_by: pInput.adminProfile.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
      linked_profile_id: decision.targetProfileId,
    })
    .eq("id", request.id);

  if (requestError) {
    throw new Error(requestError.message);
  }

  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "account_request.approved",
    entityType: "account_request",
    entityId: request.id,
    beforeData: { status: request.status },
    afterData: {
      status: "approved",
      mode: decision.mode,
      targetProfileId: decision.targetProfileId,
    },
  });
}

export async function rejectAccountRequest(pInput: {
  adminProfile: ProfileRow;
  requestId: string;
  rejectionReason: string | null;
}): Promise<void> {
  assertAdminProfile(pInput.adminProfile);
  const admin = createSupabaseAdminClient();

  const requestResponse = await admin
    .from("account_requests")
    .select("*")
    .eq("id", pInput.requestId)
    .single();

  if (requestResponse.error || !requestResponse.data) {
    throw new Error("Demande introuvable.");
  }

  const request = mapAccountRequestRow(requestResponse.data as AccountRequestDbRow);
  if (request.status !== "pending") {
    throw new Error("Cette demande a déjà été traitée.");
  }

  const { error: requestError } = await admin
    .from("account_requests")
    .update({
      status: "rejected",
      reviewed_by: pInput.adminProfile.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: pInput.rejectionReason,
    })
    .eq("id", request.id);

  if (requestError) {
    throw new Error(requestError.message);
  }

  const applicantProfileResponse = await admin
    .from("profiles")
    .select("*")
    .eq("auth_user_id", request.authUserId)
    .maybeSingle();

  if (applicantProfileResponse.error) {
    throw new Error(applicantProfileResponse.error.message);
  }

  if (applicantProfileResponse.data) {
    const profile = mapProfileRow(applicantProfileResponse.data as ProfileDbRow);
    const nextStatus = nextStatusAfterReject(profile.status);
    if (nextStatus && nextStatus !== profile.status) {
      const { error } = await admin
        .from("profiles")
        .update({ status: nextStatus })
        .eq("id", profile.id);
      if (error) {
        throw new Error(error.message);
      }
    }

    await createNotification({
      recipientProfileId: profile.id,
      type: "accountRejected",
      title: "Demande refusée",
      message: pInput.rejectionReason
        ? `Votre inscription a été refusée : ${pInput.rejectionReason}`
        : "Votre inscription a été refusée.",
    });
  }

  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "account_request.rejected",
    entityType: "account_request",
    entityId: request.id,
    beforeData: { status: request.status },
    afterData: {
      status: "rejected",
      rejectionReason: pInput.rejectionReason,
    },
  });
}

export async function suspendProfile(pInput: {
  adminProfile: ProfileRow;
  profileId: string;
}): Promise<void> {
  assertAdminProfile(pInput.adminProfile);
  if (pInput.profileId === pInput.adminProfile.id) {
    throw new Error("Vous ne pouvez pas suspendre votre propre compte administrateur.");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
    })
    .eq("id", pInput.profileId)
    .in("status", ["active"])
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de suspendre ce profil.");
  }

  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "profile.suspended",
    entityType: "profile",
    entityId: pInput.profileId,
    afterData: { status: "suspended" },
  });
}

export async function reactivateProfile(pInput: {
  adminProfile: ProfileRow;
  profileId: string;
}): Promise<void> {
  assertAdminProfile(pInput.adminProfile);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .update({
      status: "active",
      suspended_at: null,
    })
    .eq("id", pInput.profileId)
    .eq("status", "suspended")
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de réactiver ce profil.");
  }

  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "profile.reactivated",
    entityType: "profile",
    entityId: pInput.profileId,
    afterData: { status: "active" },
  });
}

export async function correctProfilePseudo(pInput: {
  adminProfile: ProfileRow;
  profileId: string;
  newPseudo: string;
}): Promise<void> {
  assertAdminProfile(pInput.adminProfile);
  const parsed = pseudoSchema.safeParse(pInput.newPseudo);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Pseudo invalide.");
  }

  const normalized = normalizePseudo(parsed.data);
  const admin = createSupabaseAdminClient();

  const conflictResponse = await admin
    .from("profiles")
    .select("id")
    .eq("normalized_pseudo", normalized)
    .neq("id", pInput.profileId)
    .maybeSingle();

  if (conflictResponse.error) {
    throw new Error(conflictResponse.error.message);
  }
  if (conflictResponse.data) {
    throw new Error("Ce pseudo est déjà utilisé.");
  }

  const beforeResponse = await admin.from("profiles").select("*").eq("id", pInput.profileId).single();
  if (beforeResponse.error || !beforeResponse.data) {
    throw new Error("Profil introuvable.");
  }

  const { data, error } = await admin
    .from("profiles")
    .update({
      pseudo: parsed.data,
      normalized_pseudo: normalized,
      slug: slugify(parsed.data),
    })
    .eq("id", pInput.profileId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de corriger le pseudo.");
  }

  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "profile.pseudo_corrected",
    entityType: "profile",
    entityId: pInput.profileId,
    beforeData: { pseudo: (beforeResponse.data as ProfileDbRow).pseudo },
    afterData: { pseudo: parsed.data },
  });
}
