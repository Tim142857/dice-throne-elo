import { isAchievementsEligibleByPlayedAt } from "@/domain/achievements/eligibility";
import {
  assertTransitionAllowed,
  buildDuplicateFingerprint,
  buildMatchIdentityFingerprint,
  getOpponentProfileId,
  resolveActorRole,
} from "@/domain/matches/workflow";
import { getWinnerRemainingHealthFromFinalHealth } from "@/domain/matches/final-health";
import { assertAdminProfile, createNotification, writeAuditLog } from "@/lib/admin/audit";
import { listActiveHeroes } from "@/lib/admin/hero-admin";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { applyEloForValidatedMatch } from "@/lib/matches/apply-elo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SEED_IDS, type MatchProposalRow, type MatchRow, type ProfileRow } from "@/types/database";
import type { MatchStatus } from "@/types/domain";
import type { MatchActionType } from "@/types/database";
import type { MatchProposalFields } from "@/validation/match";
import {
  correctMatchSchema,
  createMatchSchema,
  updateMatchProposalSchema,
} from "@/validation/match";

export type MatchWithProposal = {
  match: MatchRow;
  proposal: MatchProposalRow;
  player1: ProfileRow;
  player2: ProfileRow;
};

function requireActivePlayer(pProfile: ProfileRow | null): ProfileRow {
  if (!pProfile || pProfile.status !== "active") {
    throw new Error("Seuls les comptes actifs peuvent gérer des matchs.");
  }
  return pProfile;
}

async function loadMatch(pMatchId: string): Promise<MatchRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("matches").select("*").eq("id", pMatchId).single();
  if (error || !data) {
    throw new Error("Match introuvable.");
  }
  return mapMatchRow(data as MatchDbRow);
}

async function loadProposal(pProposalId: string): Promise<MatchProposalRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("match_proposals")
    .select("*")
    .eq("id", pProposalId)
    .single();
  if (error || !data) {
    throw new Error("Proposition introuvable.");
  }
  return mapMatchProposalRow(data as MatchProposalDbRow);
}

async function loadProfile(pProfileId: string): Promise<ProfileRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("profiles").select("*").eq("id", pProfileId).single();
  if (error || !data) {
    throw new Error("Profil introuvable.");
  }
  return mapProfileRow(data as ProfileDbRow);
}

async function assertHeroesActive(pHero1Id: string, pHero2Id: string): Promise<void> {
  const heroes = await listActiveHeroes();
  const activeIds = new Set(heroes.map((pHero) => pHero.id));
  if (!activeIds.has(pHero1Id) || !activeIds.has(pHero2Id)) {
    throw new Error("Les deux héros doivent être actifs.");
  }
}

async function recordAction(pInput: {
  matchId: string;
  actorProfileId: string;
  actionType: MatchActionType;
  fromStatus: MatchStatus | null;
  toStatus: MatchStatus;
  reason?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("match_actions").insert({
    match_id: pInput.matchId,
    actor_profile_id: pInput.actorProfileId,
    action_type: pInput.actionType,
    from_status: pInput.fromStatus,
    to_status: pInput.toStatus,
    reason: pInput.reason ?? null,
    metadata: pInput.metadata ?? {},
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function insertProposal(pInput: {
  matchId: string;
  versionNumber: number;
  proposedByProfileId: string;
  fields: MatchProposalFields;
}): Promise<MatchProposalRow> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("match_proposals")
    .insert({
      match_id: pInput.matchId,
      version_number: pInput.versionNumber,
      proposed_by_profile_id: pInput.proposedByProfileId,
      player1_id: pInput.fields.player1Id,
      hero1_id: pInput.fields.hero1Id,
      player2_id: pInput.fields.player2Id,
      hero2_id: pInput.fields.hero2Id,
      winner_profile_id: pInput.fields.winnerProfileId,
      winner_remaining_health: getWinnerRemainingHealthFromFinalHealth({
        player1Id: pInput.fields.player1Id,
        winnerProfileId: pInput.fields.winnerProfileId,
        player1RemainingHealth: pInput.fields.player1RemainingHealth,
        player2RemainingHealth: pInput.fields.player2RemainingHealth,
      }),
      player1_remaining_health: pInput.fields.player1RemainingHealth,
      player2_remaining_health: pInput.fields.player2RemainingHealth,
      notes: pInput.fields.notes,
      played_at: pInput.fields.playedAt,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible d’enregistrer la proposition.");
  }
  return mapMatchProposalRow(data as MatchProposalDbRow);
}

export type MatchIdentityDuplicate = {
  matchId: string;
  createdByProfileId: string;
  status: string;
};

export async function findIdentityDuplicateMatches(
  pFields: Pick<
    MatchProposalFields,
    "playedAt" | "player1Id" | "player2Id" | "hero1Id" | "hero2Id"
  >,
  pExcludeMatchId?: string,
): Promise<MatchIdentityDuplicate[]> {
  const admin = createSupabaseAdminClient();
  const fingerprint = buildMatchIdentityFingerprint({
    playedAt: pFields.playedAt,
    player1Id: pFields.player1Id,
    player2Id: pFields.player2Id,
    hero1Id: pFields.hero1Id,
    hero2Id: pFields.hero2Id,
  });

  const { data, error } = await admin
    .from("matches")
    .select("id, current_proposal_id, status, created_by_profile_id")
    .eq("played_at", pFields.playedAt)
    .in("status", ["pendingOpponent", "pendingCreatorConfirmation", "validated", "disputed"]);

  if (error) {
    throw new Error(error.message);
  }

  const duplicates: MatchIdentityDuplicate[] = [];
  for (const row of data ?? []) {
    if (pExcludeMatchId && row.id === pExcludeMatchId) {
      continue;
    }
    if (!row.current_proposal_id) {
      continue;
    }
    const proposal = await loadProposal(row.current_proposal_id as string);
    const otherFingerprint = buildMatchIdentityFingerprint({
      playedAt: proposal.playedAt,
      player1Id: proposal.player1Id,
      player2Id: proposal.player2Id,
      hero1Id: proposal.hero1Id,
      hero2Id: proposal.hero2Id,
    });
    if (otherFingerprint === fingerprint) {
      duplicates.push({
        matchId: row.id as string,
        createdByProfileId: row.created_by_profile_id as string,
        status: row.status as string,
      });
    }
  }
  return duplicates;
}

/** @deprecated Prefer findIdentityDuplicateMatches (score-agnostic). */
export async function findProbableDuplicateMatchIds(
  pFields: MatchProposalFields,
  pExcludeMatchId?: string,
): Promise<string[]> {
  const duplicates = await findIdentityDuplicateMatches(pFields, pExcludeMatchId);
  return duplicates.map((pItem) => pItem.matchId);
}

export type CreateMatchResult =
  | {
      status: "created";
      match: MatchRow;
      proposal: MatchProposalRow;
      probableDuplicateIds: string[];
    }
  | {
      status: "needs_confirmation";
      opponentDuplicateIds: string[];
    };

export async function createMatch(pInput: {
  actor: ProfileRow;
  fields: unknown;
  acknowledgeDuplicates?: boolean;
}): Promise<CreateMatchResult> {
  const actor = requireActivePlayer(pInput.actor);
  const parsed = createMatchSchema.safeParse(pInput.fields);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  if (actor.id !== parsed.data.player1Id && actor.id !== parsed.data.player2Id) {
    throw new Error("Vous devez être l’un des deux participants.");
  }

  await assertHeroesActive(parsed.data.hero1Id, parsed.data.hero2Id);
  await loadProfile(parsed.data.player1Id);
  await loadProfile(parsed.data.player2Id);

  const identityDuplicates = await findIdentityDuplicateMatches(parsed.data);
  const ownDuplicates = identityDuplicates.filter(
    (pItem) => pItem.createdByProfileId === actor.id,
  );
  const opponentDuplicates = identityDuplicates.filter(
    (pItem) => pItem.createdByProfileId !== actor.id,
  );

  if (ownDuplicates.length > 0) {
    throw new Error(
      `Vous avez déjà déclaré ce match (même date, joueurs et héros). Ouvrez-le plutôt : /mes-matchs/${ownDuplicates[0]!.matchId}`,
    );
  }

  if (opponentDuplicates.length > 0 && !pInput.acknowledgeDuplicates) {
    return {
      status: "needs_confirmation",
      opponentDuplicateIds: opponentDuplicates.map((pItem) => pItem.matchId),
    };
  }

  const admin = createSupabaseAdminClient();

  const { data: matchData, error: matchError } = await admin
    .from("matches")
    .insert({
      season_id: SEED_IDS.globalSeasonId,
      created_by_profile_id: actor.id,
      player1_id: parsed.data.player1Id,
      player2_id: parsed.data.player2Id,
      status: "pendingOpponent",
      played_at: parsed.data.playedAt,
      achievements_eligible: isAchievementsEligibleByPlayedAt(parsed.data.playedAt),
    })
    .select("*")
    .single();

  if (matchError || !matchData) {
    throw new Error(matchError?.message ?? "Impossible de créer le match.");
  }

  const match = mapMatchRow(matchData as MatchDbRow);
  const proposal = await insertProposal({
    matchId: match.id,
    versionNumber: 1,
    proposedByProfileId: actor.id,
    fields: parsed.data,
  });

  const { error: linkError } = await admin
    .from("matches")
    .update({ current_proposal_id: proposal.id })
    .eq("id", match.id);

  if (linkError) {
    throw new Error(linkError.message);
  }

  // Race guard once the proposal is linked (identity fingerprint is complete).
  const duplicatesAfterInsert = await findIdentityDuplicateMatches(parsed.data, match.id);
  const ownAfterInsert = duplicatesAfterInsert.filter(
    (pItem) => pItem.createdByProfileId === actor.id,
  );
  if (ownAfterInsert.length > 0) {
    await admin
      .from("matches")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        current_proposal_id: proposal.id,
      })
      .eq("id", match.id);
    throw new Error(
      `Vous avez déjà déclaré ce match (même date, joueurs et héros). Ouvrez-le plutôt : /mes-matchs/${ownAfterInsert[0]!.matchId}`,
    );
  }

  const probableDuplicateIds = [
    ...opponentDuplicates.map((pItem) => pItem.matchId),
    ...duplicatesAfterInsert
      .filter((pItem) => pItem.createdByProfileId !== actor.id)
      .map((pItem) => pItem.matchId),
  ].filter((pId, pIndex, pAll) => pAll.indexOf(pId) === pIndex);

  await recordAction({
    matchId: match.id,
    actorProfileId: actor.id,
    actionType: "created",
    fromStatus: null,
    toStatus: "pendingOpponent",
    metadata: { proposalId: proposal.id, probableDuplicateIds },
  });

  const opponentId = getOpponentProfileId({
    createdByProfileId: actor.id,
    player1Id: parsed.data.player1Id,
    player2Id: parsed.data.player2Id,
  });

  await createNotification({
    recipientProfileId: opponentId,
    type: "matchPendingValidation",
    title: "Match à valider",
    message: `${actor.pseudo} a déclaré un match en attente de votre validation.`,
    relatedMatchId: match.id,
  });

  await writeAuditLog({
    actorProfileId: actor.id,
    action: "match.created",
    entityType: "match",
    entityId: match.id,
    afterData: {
      status: "pendingOpponent",
      proposalId: proposal.id,
      acknowledgedOpponentDuplicates: probableDuplicateIds,
    },
  });

  return {
    status: "created",
    match: { ...match, currentProposalId: proposal.id },
    proposal,
    probableDuplicateIds,
  };
}

export async function updateMatchProposal(pInput: {
  actor: ProfileRow;
  matchId: string;
  fields: unknown;
}): Promise<{ match: MatchRow; proposal: MatchProposalRow; probableDuplicateIds: string[] }> {
  const actor = requireActivePlayer(pInput.actor);
  const parsed = updateMatchProposalSchema.safeParse(pInput.fields);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: actor.role === "admin",
  });

  assertTransitionAllowed({
    from: match.status,
    to: "pendingOpponent",
    action: "updated",
    actor: role,
  });

  if (actor.id !== parsed.data.player1Id && actor.id !== parsed.data.player2Id) {
    throw new Error("Vous devez rester participant du match.");
  }
  if (match.createdByProfileId !== actor.id) {
    throw new Error("Seul le déclarant peut modifier la proposition.");
  }

  await assertHeroesActive(parsed.data.hero1Id, parsed.data.hero2Id);
  const currentProposal = match.currentProposalId
    ? await loadProposal(match.currentProposalId)
    : null;
  const nextVersion = (currentProposal?.versionNumber ?? 0) + 1;
  const probableDuplicateIds = await findProbableDuplicateMatchIds(parsed.data, match.id);

  const proposal = await insertProposal({
    matchId: match.id,
    versionNumber: nextVersion,
    proposedByProfileId: actor.id,
    fields: parsed.data,
  });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({
      player1_id: parsed.data.player1Id,
      player2_id: parsed.data.player2Id,
      played_at: parsed.data.playedAt,
      achievements_eligible: isAchievementsEligibleByPlayedAt(parsed.data.playedAt),
      current_proposal_id: proposal.id,
      status: "pendingOpponent",
    })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de mettre à jour le match.");
  }

  await recordAction({
    matchId: match.id,
    actorProfileId: actor.id,
    actionType: "updated",
    fromStatus: match.status,
    toStatus: "pendingOpponent",
    metadata: {
      previousProposalId: currentProposal?.id ?? null,
      proposalId: proposal.id,
    },
  });

  await writeAuditLog({
    actorProfileId: actor.id,
    action: "match.updated",
    entityType: "match",
    entityId: match.id,
    beforeData: { proposalId: currentProposal?.id ?? null },
    afterData: { proposalId: proposal.id },
  });

  return {
    match: mapMatchRow(data as MatchDbRow),
    proposal,
    probableDuplicateIds,
  };
}

export async function cancelMatchByCreator(pInput: {
  actor: ProfileRow;
  matchId: string;
}): Promise<MatchRow> {
  const actor = requireActivePlayer(pInput.actor);
  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: false,
  });

  assertTransitionAllowed({
    from: match.status,
    to: "cancelled",
    action: "cancelledByCreator",
    actor: role,
  });

  const admin = createSupabaseAdminClient();
  const cancelledAt = new Date().toISOString();
  const { data, error } = await admin
    .from("matches")
    .update({
      status: "cancelled",
      cancelled_at: cancelledAt,
    })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible d’annuler le match.");
  }

  await recordAction({
    matchId: match.id,
    actorProfileId: actor.id,
    actionType: "cancelledByCreator",
    fromStatus: match.status,
    toStatus: "cancelled",
  });

  return mapMatchRow(data as MatchDbRow);
}

async function finalizeValidation(pInput: {
  match: MatchRow;
  actor: ProfileRow;
  actionType: MatchActionType;
  actorRole: "creator" | "opponent" | "admin";
  notifyType?: "matchValidated" | "adminDecision";
  reason?: string | null;
}): Promise<MatchRow> {
  if (!pInput.match.currentProposalId) {
    throw new Error("Aucune proposition à valider.");
  }

  assertTransitionAllowed({
    from: pInput.match.status,
    to: "validated",
    action: pInput.actionType,
    actor: pInput.actorRole,
  });

  const proposal = await loadProposal(pInput.match.currentProposalId);
  const validatedAt = new Date().toISOString();
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin
    .from("matches")
    .update({
      status: "validated",
      validated_at: validatedAt,
      validated_by_profile_id: pInput.actor.id,
      played_at: proposal.playedAt,
      player1_id: proposal.player1Id,
      player2_id: proposal.player2Id,
    })
    .eq("id", pInput.match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de valider le match.");
  }

  await applyEloForValidatedMatch({
    matchId: pInput.match.id,
    proposal,
    processedAt: validatedAt,
  });

  let unlocks: {
    player1: import("@/domain/achievements/evaluate").UnlockedAchievement[];
    player2: import("@/domain/achievements/evaluate").UnlockedAchievement[];
  } = { player1: [], player2: [] };

  try {
    const { evaluateAchievementsAfterValidation } = await import("@/lib/achievements/service");
    unlocks = await evaluateAchievementsAfterValidation({
      matchId: pInput.match.id,
      player1Id: proposal.player1Id,
      player2Id: proposal.player2Id,
    });
  } catch {
    // Achievements must not block match validation; admin recompute can repair.
  }

  try {
    const { emitActivityForValidatedMatch } = await import("@/lib/activity/emit");
    await emitActivityForValidatedMatch({
      matchId: pInput.match.id,
      proposal,
      occurredAt: validatedAt,
      unlocks,
    });
  } catch {
    // Activity feed must not block match validation.
  }

  await recordAction({
    matchId: pInput.match.id,
    actorProfileId: pInput.actor.id,
    actionType: pInput.actionType,
    fromStatus: pInput.match.status,
    toStatus: "validated",
    reason: pInput.reason ?? null,
    metadata: { proposalId: proposal.id },
  });

  const notifyType = pInput.notifyType ?? "matchValidated";
  const title = notifyType === "adminDecision" ? "Décision administrative" : "Match validé";
  const message =
    notifyType === "adminDecision"
      ? "Un administrateur a validé le match : il est pris en compte dans les classements."
      : "Le match a été validé et pris en compte dans les classements.";

  const recipientIds = new Set([pInput.match.player1Id, pInput.match.player2Id]);
  for (const recipientId of recipientIds) {
    await createNotification({
      recipientProfileId: recipientId,
      type: notifyType,
      title,
      message,
      relatedMatchId: pInput.match.id,
    });
  }

  await writeAuditLog({
    actorProfileId: pInput.actor.id,
    action: "match.validated",
    entityType: "match",
    entityId: pInput.match.id,
    afterData: {
      status: "validated",
      validatedAt,
      reason: pInput.reason ?? null,
      actionType: pInput.actionType,
    },
  });

  return mapMatchRow(data as MatchDbRow);
}

export async function validateMatchByOpponent(pInput: {
  actor: ProfileRow;
  matchId: string;
}): Promise<MatchRow> {
  const actor = requireActivePlayer(pInput.actor);
  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: false,
  });

  if (role !== "opponent") {
    throw new Error("Seul l’adversaire peut valider ce match.");
  }

  return finalizeValidation({
    match,
    actor,
    actionType: "validatedByOpponent",
    actorRole: "opponent",
  });
}

export async function rejectMatchByOpponent(pInput: {
  actor: ProfileRow;
  matchId: string;
  reason: string;
}): Promise<MatchRow> {
  const actor = requireActivePlayer(pInput.actor);
  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: false,
  });

  assertTransitionAllowed({
    from: match.status,
    to: "rejected",
    action: "rejectedByOpponent",
    actor: role,
  });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({ status: "rejected" })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de refuser le match.");
  }

  await recordAction({
    matchId: match.id,
    actorProfileId: actor.id,
    actionType: "rejectedByOpponent",
    fromStatus: match.status,
    toStatus: "rejected",
    reason: pInput.reason,
  });

  await createNotification({
    recipientProfileId: match.createdByProfileId,
    type: "matchRejected",
    title: "Match refusé",
    message: `Votre adversaire a refusé le match : ${pInput.reason}`,
    relatedMatchId: match.id,
  });

  await writeAuditLog({
    actorProfileId: actor.id,
    action: "match.rejected",
    entityType: "match",
    entityId: match.id,
    afterData: { status: "rejected", reason: pInput.reason },
  });

  return mapMatchRow(data as MatchDbRow);
}

export async function proposeMatchCorrection(pInput: {
  actor: ProfileRow;
  matchId: string;
  fields: unknown;
}): Promise<{ match: MatchRow; proposal: MatchProposalRow }> {
  const actor = requireActivePlayer(pInput.actor);
  const parsed = correctMatchSchema.safeParse(pInput.fields);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: false,
  });

  assertTransitionAllowed({
    from: match.status,
    to: "pendingCreatorConfirmation",
    action: "correctionProposed",
    actor: role,
  });

  if (
    parsed.data.player1Id !== match.player1Id ||
    parsed.data.player2Id !== match.player2Id
  ) {
    throw new Error("Une correction ne peut pas changer les joueurs du match.");
  }

  await assertHeroesActive(parsed.data.hero1Id, parsed.data.hero2Id);
  const currentProposal = match.currentProposalId
    ? await loadProposal(match.currentProposalId)
    : null;
  const proposal = await insertProposal({
    matchId: match.id,
    versionNumber: (currentProposal?.versionNumber ?? 0) + 1,
    proposedByProfileId: actor.id,
    fields: parsed.data,
  });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({
      current_proposal_id: proposal.id,
      played_at: parsed.data.playedAt,
      achievements_eligible: isAchievementsEligibleByPlayedAt(parsed.data.playedAt),
      status: "pendingCreatorConfirmation",
    })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de proposer la correction.");
  }

  await recordAction({
    matchId: match.id,
    actorProfileId: actor.id,
    actionType: "correctionProposed",
    fromStatus: match.status,
    toStatus: "pendingCreatorConfirmation",
    metadata: { proposalId: proposal.id },
  });

  await createNotification({
    recipientProfileId: match.createdByProfileId,
    type: "correctionProposed",
    title: "Correction proposée",
    message: "Votre adversaire a proposé une correction du match.",
    relatedMatchId: match.id,
  });

  return {
    match: mapMatchRow(data as MatchDbRow),
    proposal,
  };
}

export async function acceptMatchCorrection(pInput: {
  actor: ProfileRow;
  matchId: string;
}): Promise<MatchRow> {
  const actor = requireActivePlayer(pInput.actor);
  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: false,
  });

  if (role !== "creator") {
    throw new Error("Seul le déclarant peut accepter la correction.");
  }

  return finalizeValidation({
    match,
    actor,
    actionType: "correctionAccepted",
    actorRole: "creator",
  });
}

export async function rejectMatchCorrection(pInput: {
  actor: ProfileRow;
  matchId: string;
}): Promise<MatchRow> {
  const actor = requireActivePlayer(pInput.actor);
  const match = await loadMatch(pInput.matchId);
  const role = resolveActorRole({
    actorProfileId: actor.id,
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
    isAdmin: false,
  });

  assertTransitionAllowed({
    from: match.status,
    to: "disputed",
    action: "correctionRejected",
    actor: role,
  });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({ status: "disputed" })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de refuser la correction.");
  }

  await recordAction({
    matchId: match.id,
    actorProfileId: actor.id,
    actionType: "correctionRejected",
    fromStatus: match.status,
    toStatus: "disputed",
  });

  const opponentId = getOpponentProfileId({
    createdByProfileId: match.createdByProfileId,
    player1Id: match.player1Id,
    player2Id: match.player2Id,
  });

  await createNotification({
    recipientProfileId: opponentId,
    type: "matchDisputed",
    title: "Match en litige",
    message: "La correction a été refusée. Le match est passé en litige.",
    relatedMatchId: match.id,
  });

  return mapMatchRow(data as MatchDbRow);
}

export async function listMatchesForProfile(pProfileId: string): Promise<MatchWithProposal[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .or(`player1_id.eq.${pProfileId},player2_id.eq.${pProfileId}`)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const results: MatchWithProposal[] = [];
  for (const row of data ?? []) {
    const match = mapMatchRow(row as MatchDbRow);
    if (!match.currentProposalId) {
      continue;
    }
    const [proposal, player1, player2] = await Promise.all([
      loadProposal(match.currentProposalId),
      loadProfile(match.player1Id),
      loadProfile(match.player2Id),
    ]);
    results.push({ match, proposal, player1, player2 });
  }
  return results;
}

export async function getMatchDetails(pMatchId: string): Promise<MatchWithProposal> {
  const match = await loadMatch(pMatchId);
  if (!match.currentProposalId) {
    throw new Error("Proposition manquante.");
  }
  const [proposal, player1, player2] = await Promise.all([
    loadProposal(match.currentProposalId),
    loadProfile(match.player1Id),
    loadProfile(match.player2Id),
  ]);
  return { match, proposal, player1, player2 };
}

export async function listOpponentCandidates(pExcludeProfileId: string): Promise<ProfileRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .in("status", ["active", "preloaded"])
    .neq("id", pExcludeProfileId)
    .order("pseudo", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as ProfileDbRow[]).map(mapProfileRow);
}

export async function listProposalsForMatch(pMatchId: string): Promise<MatchProposalRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("match_proposals")
    .select("*")
    .eq("match_id", pMatchId)
    .order("version_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MatchProposalDbRow[]).map(mapMatchProposalRow);
}

export async function listDisputedMatches(): Promise<MatchWithProposal[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("*")
    .eq("status", "disputed")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const results: MatchWithProposal[] = [];
  for (const row of data ?? []) {
    const match = mapMatchRow(row as MatchDbRow);
    if (!match.currentProposalId) {
      continue;
    }
    const [proposal, player1, player2] = await Promise.all([
      loadProposal(match.currentProposalId),
      loadProfile(match.player1Id),
      loadProfile(match.player2Id),
    ]);
    results.push({ match, proposal, player1, player2 });
  }
  return results;
}

export async function validatePendingMatchByAdmin(pInput: {
  admin: ProfileRow;
  matchId: string;
  reason?: string | null;
}): Promise<MatchRow> {
  assertAdminProfile(pInput.admin);
  const match = await loadMatch(pInput.matchId);

  if (
    match.status !== "pendingOpponent" &&
    match.status !== "pendingCreatorConfirmation"
  ) {
    throw new Error("Seul un match en attente de validation peut être forcé ainsi.");
  }

  return finalizeValidation({
    match,
    actor: pInput.admin,
    actionType: "resolvedByAdmin",
    actorRole: "admin",
    notifyType: "adminDecision",
    reason: pInput.reason?.trim() || null,
  });
}

export async function resolveDisputedMatchByAdmin(pInput: {
  admin: ProfileRow;
  matchId: string;
  mode: "keepProposal" | "custom";
  proposalId?: string;
  fields?: unknown;
  reason?: string | null;
}): Promise<MatchRow> {
  assertAdminProfile(pInput.admin);
  const match = await loadMatch(pInput.matchId);
  if (match.status !== "disputed") {
    throw new Error("Seul un match en litige peut être tranché ainsi.");
  }

  const reason = pInput.reason?.trim() || null;
  let workingMatch = match;

  if (pInput.mode === "keepProposal") {
    const proposalId = pInput.proposalId;
    if (!proposalId) {
      throw new Error("Proposition à valider manquante.");
    }
    const proposals = await listProposalsForMatch(match.id);
    if (!proposals.some((pProposal) => pProposal.id === proposalId)) {
      throw new Error("Proposition invalide pour ce match.");
    }
    if (match.currentProposalId !== proposalId) {
      const chosen = proposals.find((pProposal) => pProposal.id === proposalId)!;
      const adminClient = createSupabaseAdminClient();
      const { data, error } = await adminClient
        .from("matches")
        .update({
          current_proposal_id: proposalId,
          played_at: chosen.playedAt,
          achievements_eligible: isAchievementsEligibleByPlayedAt(chosen.playedAt),
          player1_id: chosen.player1Id,
          player2_id: chosen.player2Id,
        })
        .eq("id", match.id)
        .select("*")
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? "Impossible de sélectionner la proposition.");
      }
      workingMatch = mapMatchRow(data as MatchDbRow);
    }
  } else {
    const parsed = correctMatchSchema.safeParse(pInput.fields);
    if (!parsed.success) {
      throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
    }
    if (
      parsed.data.player1Id !== match.player1Id ||
      parsed.data.player2Id !== match.player2Id
    ) {
      throw new Error("La décision admin ne peut pas changer les joueurs.");
    }
    await assertHeroesActive(parsed.data.hero1Id, parsed.data.hero2Id);
    const proposals = await listProposalsForMatch(match.id);
    const maxVersion = proposals.reduce((pMax, pProposal) => Math.max(pMax, pProposal.versionNumber), 0);
    const proposal = await insertProposal({
      matchId: match.id,
      versionNumber: maxVersion + 1,
      proposedByProfileId: pInput.admin.id,
      fields: parsed.data,
    });
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from("matches")
      .update({
        current_proposal_id: proposal.id,
        played_at: parsed.data.playedAt,
        achievements_eligible: isAchievementsEligibleByPlayedAt(parsed.data.playedAt),
        player1_id: parsed.data.player1Id,
        player2_id: parsed.data.player2Id,
      })
      .eq("id", match.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Impossible d’enregistrer la décision.");
    }
    workingMatch = mapMatchRow(data as MatchDbRow);
  }

  return finalizeValidation({
    match: workingMatch,
    actor: pInput.admin,
    actionType: "resolvedByAdmin",
    actorRole: "admin",
    notifyType: "adminDecision",
    reason,
  });
}

export async function cancelDisputedMatchByAdmin(pInput: {
  admin: ProfileRow;
  matchId: string;
  reason?: string | null;
}): Promise<MatchRow> {
  assertAdminProfile(pInput.admin);
  const match = await loadMatch(pInput.matchId);

  assertTransitionAllowed({
    from: match.status,
    to: "cancelledByAdmin",
    action: "cancelledByAdmin",
    actor: "admin",
  });

  const reason = pInput.reason?.trim() || null;
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .update({ status: "cancelledByAdmin" })
    .eq("id", match.id)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible d’annuler le match.");
  }

  await recordAction({
    matchId: match.id,
    actorProfileId: pInput.admin.id,
    actionType: "cancelledByAdmin",
    fromStatus: match.status,
    toStatus: "cancelledByAdmin",
    reason,
  });

  for (const recipientId of new Set([match.player1Id, match.player2Id])) {
    await createNotification({
      recipientProfileId: recipientId,
      type: "adminDecision",
      title: "Décision administrative",
      message: reason
        ? `Un administrateur a annulé le match : ${reason}`
        : "Un administrateur a annulé définitivement le match en litige.",
      relatedMatchId: match.id,
    });
  }

  await writeAuditLog({
    actorProfileId: pInput.admin.id,
    action: "match.cancelled_by_admin",
    entityType: "match",
    entityId: match.id,
    afterData: { status: "cancelledByAdmin", reason },
  });

  return mapMatchRow(data as MatchDbRow);
}
