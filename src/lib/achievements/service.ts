import {
  evaluateAchievementsForPlayer,
  computeOwnedAchievementCodes,
  type AchievementMatchFact,
  type UnlockedAchievement,
} from "@/domain/achievements/evaluate";
import { isAchievementsEligibleByPlayedAt } from "@/domain/achievements/eligibility";
import { ACHIEVEMENT_DEFINITIONS, getAchievementDefinition } from "@/domain/achievements/definitions";
import { createNotification, writeAuditLog } from "@/lib/admin/audit";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SEED_IDS } from "@/types/database";

type RatingEventRow = {
  match_id: string;
  profile_id: string;
  rating_before: string | number;
  rating_after: string | number;
  rating_change: string | number;
};

function toNumber(pValue: string | number): number {
  return typeof pValue === "number" ? pValue : Number(pValue);
}

export type PlayerAchievementRow = {
  id: string;
  profileId: string;
  achievementCode: string;
  unlockedAt: string;
  triggerMatchId: string | null;
  metadata: Record<string, unknown>;
};

export async function loadAchievementFactsForProfiles(
  pProfileIds: string[],
): Promise<AchievementMatchFact[]> {
  if (pProfileIds.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const profileSet = new Set(pProfileIds);
  const profileFilter = pProfileIds
    .map((pId) => `player1_id.eq.${pId},player2_id.eq.${pId}`)
    .join(",");

  const { data, error } = await admin
    .from("matches")
    .select("*")
    .eq("status", "validated")
    .eq("season_id", SEED_IDS.globalSeasonId)
    .or(profileFilter)
    .order("validated_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const matches = ((data ?? []) as MatchDbRow[])
    .map(mapMatchRow)
    .filter(
      (pMatch) =>
        pMatch.currentProposalId &&
        pMatch.validatedAt &&
        (profileSet.has(pMatch.player1Id) || profileSet.has(pMatch.player2Id)),
    );

  if (matches.length === 0) {
    return [];
  }

  const proposalIds = matches.map((pMatch) => pMatch.currentProposalId!);
  const matchIds = matches.map((pMatch) => pMatch.id);

  const [proposalsResponse, eventsResponse] = await Promise.all([
    admin.from("match_proposals").select("*").in("id", proposalIds),
    admin
      .from("rating_events")
      .select("match_id, profile_id, rating_before, rating_after, rating_change")
      .in("match_id", matchIds)
      .eq("rating_type", "general"),
  ]);

  if (proposalsResponse.error) {
    throw new Error(proposalsResponse.error.message);
  }
  if (eventsResponse.error) {
    throw new Error(eventsResponse.error.message);
  }

  const proposalsById = new Map(
    ((proposalsResponse.data ?? []) as MatchProposalDbRow[]).map((pRow) => [
      pRow.id,
      mapMatchProposalRow(pRow),
    ]),
  );

  const eventsByMatch = new Map<string, RatingEventRow[]>();
  for (const row of (eventsResponse.data ?? []) as RatingEventRow[]) {
    const list = eventsByMatch.get(row.match_id) ?? [];
    list.push(row);
    eventsByMatch.set(row.match_id, list);
  }

  const facts: AchievementMatchFact[] = [];
  for (const match of matches) {
    const proposal = proposalsById.get(match.currentProposalId!);
    if (!proposal || !match.validatedAt) {
      continue;
    }
    const events = eventsByMatch.get(match.id) ?? [];
    const event1 = events.find((pEvent) => pEvent.profile_id === proposal.player1Id);
    const event2 = events.find((pEvent) => pEvent.profile_id === proposal.player2Id);

    facts.push({
      matchId: match.id,
      validatedAt: match.validatedAt,
      achievementsEligible: isAchievementsEligibleByPlayedAt(proposal.playedAt),
      player1Id: proposal.player1Id,
      player2Id: proposal.player2Id,
      hero1Id: proposal.hero1Id,
      hero2Id: proposal.hero2Id,
      winnerProfileId: proposal.winnerProfileId,
      winnerRemainingHealth: proposal.winnerRemainingHealth,
      player1EloBefore: event1 ? toNumber(event1.rating_before) : null,
      player2EloBefore: event2 ? toNumber(event2.rating_before) : null,
      player1EloAfter: event1 ? toNumber(event1.rating_after) : null,
      player2EloAfter: event2 ? toNumber(event2.rating_after) : null,
    });
  }

  return facts;
}

export async function listPlayerAchievements(pProfileId: string): Promise<PlayerAchievementRow[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("player_achievements")
    .select("*")
    .eq("profile_id", pProfileId)
    .order("unlocked_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    id: string;
    profile_id: string;
    achievement_code: string;
    unlocked_at: string;
    trigger_match_id: string | null;
    metadata: Record<string, unknown>;
  }>).map((pRow) => ({
    id: pRow.id,
    profileId: pRow.profile_id,
    achievementCode: pRow.achievement_code,
    unlockedAt: pRow.unlocked_at,
    triggerMatchId: pRow.trigger_match_id,
    metadata: pRow.metadata ?? {},
  }));
}

async function listActiveHeroIds(): Promise<string[]> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.from("heroes").select("id").eq("is_active", true);
  if (error) {
    throw new Error(error.message);
  }
  return ((data ?? []) as Array<{ id: string }>).map((pRow) => pRow.id);
}

async function persistUnlocks(
  pProfileId: string,
  pUnlocks: UnlockedAchievement[],
  pNotify: boolean,
): Promise<UnlockedAchievement[]> {
  if (pUnlocks.length === 0) {
    return [];
  }

  const admin = createSupabaseAdminClient();
  const inserted: UnlockedAchievement[] = [];

  for (const unlock of pUnlocks) {
    const { data, error } = await admin
      .from("player_achievements")
      .insert({
        profile_id: pProfileId,
        achievement_code: unlock.code,
        unlocked_at: unlock.unlockedAt,
        trigger_match_id: unlock.triggerMatchId,
        metadata: unlock.metadata,
      })
      .select("achievement_code")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        continue;
      }
      throw new Error(error.message);
    }
    if (!data) {
      continue;
    }

    inserted.push(unlock);

    if (pNotify) {
      const definition = getAchievementDefinition(unlock.code);
      await createNotification({
        recipientProfileId: pProfileId,
        type: "achievementUnlocked",
        title: `Badge débloqué : ${definition?.name ?? unlock.code}`,
        message: definition?.description ?? "Nouveau badge obtenu.",
        relatedMatchId: unlock.triggerMatchId,
      });
    }
  }

  return inserted;
}

export async function evaluateAchievementsAfterValidation(pInput: {
  matchId: string;
  player1Id: string;
  player2Id: string;
}): Promise<{ player1: UnlockedAchievement[]; player2: UnlockedAchievement[] }> {
  const admin = createSupabaseAdminClient();
  const matchResponse = await admin.from("matches").select("*").eq("id", pInput.matchId).single();
  if (matchResponse.error || !matchResponse.data) {
    throw new Error(matchResponse.error?.message ?? "Match introuvable.");
  }

  const match = mapMatchRow(matchResponse.data as MatchDbRow);
  if (!match.currentProposalId) {
    return { player1: [], player2: [] };
  }

  const proposalResponse = await admin
    .from("match_proposals")
    .select("*")
    .eq("id", match.currentProposalId)
    .single();
  if (proposalResponse.error || !proposalResponse.data) {
    throw new Error(proposalResponse.error?.message ?? "Proposition introuvable.");
  }
  const proposal = mapMatchProposalRow(proposalResponse.data as MatchProposalDbRow);
  if (!isAchievementsEligibleByPlayedAt(proposal.playedAt)) {
    return { player1: [], player2: [] };
  }

  const [facts, activeHeroIds, owned1, owned2] = await Promise.all([
    loadAchievementFactsForProfiles([pInput.player1Id, pInput.player2Id]),
    listActiveHeroIds(),
    listPlayerAchievements(pInput.player1Id),
    listPlayerAchievements(pInput.player2Id),
  ]);

  const result1 = evaluateAchievementsForPlayer({
    profileId: pInput.player1Id,
    matches: facts.filter(
      (pFact) => pFact.player1Id === pInput.player1Id || pFact.player2Id === pInput.player1Id,
    ),
    activeHeroIds,
    alreadyUnlocked: new Set(owned1.map((pItem) => pItem.achievementCode)),
  });
  const result2 = evaluateAchievementsForPlayer({
    profileId: pInput.player2Id,
    matches: facts.filter(
      (pFact) => pFact.player1Id === pInput.player2Id || pFact.player2Id === pInput.player2Id,
    ),
    activeHeroIds,
    alreadyUnlocked: new Set(owned2.map((pItem) => pItem.achievementCode)),
  });

  const [player1, player2] = await Promise.all([
    persistUnlocks(pInput.player1Id, result1.newlyUnlocked, true),
    persistUnlocks(pInput.player2Id, result2.newlyUnlocked, true),
  ]);

  return { player1, player2 };
}

export async function recomputeAllAchievements(pInput?: {
  profileIds?: string[];
  actorProfileId?: string | null;
}): Promise<{ added: number; removed: number }> {
  const admin = createSupabaseAdminClient();
  let profileIds = pInput?.profileIds;
  if (!profileIds) {
    const { data, error } = await admin
      .from("profiles")
      .select("id")
      .in("status", ["active", "preloaded", "suspended"]);
    if (error) {
      throw new Error(error.message);
    }
    profileIds = ((data ?? []) as Array<{ id: string }>).map((pRow) => pRow.id);
  }

  const activeHeroIds = await listActiveHeroIds();
  let added = 0;
  let removed = 0;

  for (const profileId of profileIds) {
    const [facts, owned] = await Promise.all([
      loadAchievementFactsForProfiles([profileId]),
      listPlayerAchievements(profileId),
    ]);
    const ownedCodes = new Set(owned.map((pItem) => pItem.achievementCode));
    const shouldOwn = computeOwnedAchievementCodes({
      profileId,
      matches: facts,
      activeHeroIds,
      alreadyUnlocked: new Set(),
    });

    if (ownedCodes.has("hero_wins_all")) {
      shouldOwn.add("hero_wins_all");
    }

    const evaluation = evaluateAchievementsForPlayer({
      profileId,
      matches: facts,
      activeHeroIds,
      alreadyUnlocked: ownedCodes,
    });
    const persisted = await persistUnlocks(profileId, evaluation.newlyUnlocked, false);
    added += persisted.length;

    const toRemove = [...ownedCodes].filter((pCode) => !shouldOwn.has(pCode));
    if (toRemove.length > 0) {
      const { error } = await admin
        .from("player_achievements")
        .delete()
        .eq("profile_id", profileId)
        .in("achievement_code", toRemove);
      if (error) {
        throw new Error(error.message);
      }
      removed += toRemove.length;
      await writeAuditLog({
        actorProfileId: pInput?.actorProfileId ?? null,
        action: "achievements.revoked",
        entityType: "profile",
        entityId: profileId,
        afterData: { codes: toRemove },
      });
    }
  }

  await writeAuditLog({
    actorProfileId: pInput?.actorProfileId ?? null,
    action: "achievements.recomputed",
    entityType: "system",
    entityId: null,
    afterData: { added, removed, profileCount: profileIds.length },
  });

  return { added, removed };
}

export async function getAchievementProgressForProfile(pProfileId: string) {
  const [facts, owned, activeHeroIds] = await Promise.all([
    loadAchievementFactsForProfiles([pProfileId]),
    listPlayerAchievements(pProfileId),
    listActiveHeroIds(),
  ]);
  const evaluation = evaluateAchievementsForPlayer({
    profileId: pProfileId,
    matches: facts,
    activeHeroIds,
    alreadyUnlocked: new Set(owned.map((pItem) => pItem.achievementCode)),
  });

  return {
    owned,
    progress: evaluation.progress,
    definitions: ACHIEVEMENT_DEFINITIONS,
  };
}
