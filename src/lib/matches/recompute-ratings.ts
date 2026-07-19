import {
  ratingsFingerprint,
  recomputeRatingsFromMatches,
  type RecomputeMatchInput,
  type RecomputeResult,
} from "@/domain/elo/recompute";
import { assertAdminProfile, writeAuditLog } from "@/lib/admin/audit";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SEED_IDS, type ProfileRow } from "@/types/database";

async function loadValidatedMatchesForRecompute(): Promise<{
  matches: RecomputeMatchInput[];
  baselineProfileIds: string[];
}> {
  const admin = createSupabaseAdminClient();

  const [matchesResponse, profilesResponse] = await Promise.all([
    admin
      .from("matches")
      .select("*")
      .eq("status", "validated")
      .eq("season_id", SEED_IDS.globalSeasonId),
    admin.from("profiles").select("id"),
  ]);

  if (matchesResponse.error) {
    throw new Error(matchesResponse.error.message);
  }
  if (profilesResponse.error) {
    throw new Error(profilesResponse.error.message);
  }

  const matches: RecomputeMatchInput[] = [];

  for (const row of matchesResponse.data ?? []) {
    const match = mapMatchRow(row as MatchDbRow);
    if (!match.validatedAt || !match.currentProposalId) {
      continue;
    }

    const proposalResponse = await admin
      .from("match_proposals")
      .select("*")
      .eq("id", match.currentProposalId)
      .single();

    if (proposalResponse.error || !proposalResponse.data) {
      throw new Error(
        proposalResponse.error?.message ?? `Proposition manquante pour le match ${match.id}.`,
      );
    }

    const proposal = mapMatchProposalRow(proposalResponse.data as MatchProposalDbRow);
    matches.push({
      matchId: match.id,
      validatedAt: match.validatedAt,
      player1Id: proposal.player1Id,
      player2Id: proposal.player2Id,
      hero1Id: proposal.hero1Id,
      hero2Id: proposal.hero2Id,
      winnerProfileId: proposal.winnerProfileId,
    });
  }

  return {
    matches,
    baselineProfileIds: ((profilesResponse.data ?? []) as Array<{ id: string }>).map(
      (pRow) => pRow.id,
    ),
  };
}

function serializeRecomputePayload(pResult: RecomputeResult) {
  return {
    events: pResult.events.map((pEvent) => ({
      matchId: pEvent.matchId,
      profileId: pEvent.profileId,
      heroId: pEvent.heroId ?? "",
      ratingType: pEvent.ratingType,
      ratingBefore: pEvent.ratingBefore,
      expectedScore: pEvent.expectedScore,
      actualScore: pEvent.actualScore,
      ratingChange: pEvent.ratingChange,
      ratingAfter: pEvent.ratingAfter,
      processedAt: pEvent.processedAt,
    })),
    playerRatings: pResult.playerRatings.map((pRow) => ({
      profileId: pRow.profileId,
      rating: pRow.rating,
      matchesCount: pRow.matchesCount,
      winsCount: pRow.winsCount,
      lossesCount: pRow.lossesCount,
      currentStreak: pRow.currentStreak,
      bestRating: pRow.bestRating,
      worstRating: pRow.worstRating === null ? "" : String(pRow.worstRating),
      lastValidatedMatchAt: pRow.lastValidatedMatchAt ?? "",
    })),
    playerHeroRatings: pResult.playerHeroRatings.map((pRow) => ({
      profileId: pRow.profileId,
      heroId: pRow.heroId,
      rating: pRow.rating,
      matchesCount: pRow.matchesCount,
      winsCount: pRow.winsCount,
      lossesCount: pRow.lossesCount,
      lastUsedAt: pRow.lastUsedAt ?? "",
    })),
  };
}

export type RecomputeSummary = {
  validatedMatches: number;
  playerRatings: number;
  playerHeroRatings: number;
  events: number;
  fingerprint: string;
};

/**
 * Full deterministic rebuild of season ratings from validated matches only.
 */
export async function recomputeSeasonRatings(pInput?: {
  adminProfile?: ProfileRow;
  reason?: string;
}): Promise<RecomputeSummary> {
  if (pInput?.adminProfile) {
    assertAdminProfile(pInput.adminProfile);
  }

  const { matches, baselineProfileIds } = await loadValidatedMatchesForRecompute();
  const result = recomputeRatingsFromMatches(matches, baselineProfileIds);
  const payload = serializeRecomputePayload(result);
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.rpc("replace_season_ratings", {
    p_season_id: SEED_IDS.globalSeasonId,
    p_events: payload.events,
    p_player_ratings: payload.playerRatings,
    p_player_hero_ratings: payload.playerHeroRatings,
  });

  if (error) {
    throw new Error(error.message);
  }

  const summary: RecomputeSummary = {
    validatedMatches: matches.length,
    playerRatings: Number((data as { playerRatings?: number } | null)?.playerRatings ?? result.playerRatings.length),
    playerHeroRatings: Number(
      (data as { playerHeroRatings?: number } | null)?.playerHeroRatings ??
        result.playerHeroRatings.length,
    ),
    events: Number((data as { events?: number } | null)?.events ?? result.events.length),
    fingerprint: ratingsFingerprint(result),
  };

  if (pInput?.adminProfile) {
    await writeAuditLog({
      actorProfileId: pInput.adminProfile.id,
      action: "ratings.recomputed",
      entityType: "season",
      entityId: SEED_IDS.globalSeasonId,
      afterData: {
        reason: pInput.reason ?? "manual",
        ...summary,
      },
    });
  }

  return summary;
}

export type ConsistencyReport = {
  isConsistent: boolean;
  expectedFingerprint: string;
  storedFingerprint: string;
  validatedMatches: number;
  storedEvents: number;
};

export async function verifyRatingsConsistency(): Promise<ConsistencyReport> {
  const { matches, baselineProfileIds } = await loadValidatedMatchesForRecompute();
  const expected = recomputeRatingsFromMatches(matches, baselineProfileIds);
  const expectedFingerprint = ratingsFingerprint(expected);

  const admin = createSupabaseAdminClient();
  const [ratingsResponse, heroRatingsResponse, eventsResponse] = await Promise.all([
    admin
      .from("player_ratings")
      .select("profile_id, rating, matches_count, wins_count, losses_count, current_streak")
      .eq("season_id", SEED_IDS.globalSeasonId)
      .order("profile_id", { ascending: true }),
    admin
      .from("player_hero_ratings")
      .select("profile_id, hero_id, rating, matches_count")
      .eq("season_id", SEED_IDS.globalSeasonId)
      .order("profile_id", { ascending: true })
      .order("hero_id", { ascending: true }),
    admin
      .from("rating_events")
      .select("id")
      .eq("season_id", SEED_IDS.globalSeasonId),
  ]);

  if (ratingsResponse.error) {
    throw new Error(ratingsResponse.error.message);
  }
  if (heroRatingsResponse.error) {
    throw new Error(heroRatingsResponse.error.message);
  }
  if (eventsResponse.error) {
    throw new Error(eventsResponse.error.message);
  }

  const storedPlayers = ((ratingsResponse.data ?? []) as Array<{
    profile_id: string;
    rating: string | number;
    matches_count: number;
    wins_count: number;
    losses_count: number;
    current_streak: number;
  }>)
    .map(
      (pRow) =>
        `${pRow.profile_id}:${Number(pRow.rating).toFixed(6)}:${pRow.matches_count}:${pRow.wins_count}:${pRow.losses_count}:${pRow.current_streak}`,
    )
    .join("|");

  const storedHeroes = ((heroRatingsResponse.data ?? []) as Array<{
    profile_id: string;
    hero_id: string;
    rating: string | number;
    matches_count: number;
  }>)
    .map(
      (pRow) =>
        `${pRow.profile_id}/${pRow.hero_id}:${Number(pRow.rating).toFixed(6)}:${pRow.matches_count}`,
    )
    .join("|");

  const storedFingerprint = `${storedPlayers}||${storedHeroes}||events:${eventsResponse.data?.length ?? 0}`;

  return {
    isConsistent: storedFingerprint === expectedFingerprint,
    expectedFingerprint,
    storedFingerprint,
    validatedMatches: matches.length,
    storedEvents: eventsResponse.data?.length ?? 0,
  };
}

export async function cancelValidatedMatchByAdmin(pInput: {
  adminProfile: ProfileRow;
  matchId: string;
  reason: string | null;
}): Promise<RecomputeSummary> {
  assertAdminProfile(pInput.adminProfile);
  const admin = createSupabaseAdminClient();

  const matchResponse = await admin.from("matches").select("*").eq("id", pInput.matchId).single();
  if (matchResponse.error || !matchResponse.data) {
    throw new Error("Match introuvable.");
  }

  const match = mapMatchRow(matchResponse.data as MatchDbRow);
  if (match.status !== "validated") {
    throw new Error("Seuls les matchs validés peuvent être annulés avec recalcul.");
  }

  const cancelledAt = new Date().toISOString();
  const { error } = await admin
    .from("matches")
    .update({
      status: "cancelledByAdmin",
      cancelled_at: cancelledAt,
      validated_at: null,
      validated_by_profile_id: null,
    })
    .eq("id", match.id);

  if (error) {
    throw new Error(error.message);
  }

  await admin.from("match_actions").insert({
    match_id: match.id,
    actor_profile_id: pInput.adminProfile.id,
    action_type: "cancelledByAdmin",
    from_status: "validated",
    to_status: "cancelledByAdmin",
    reason: pInput.reason,
    metadata: {},
  });

  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "match.cancelled_by_admin",
    entityType: "match",
    entityId: match.id,
    beforeData: { status: "validated" },
    afterData: { status: "cancelledByAdmin", reason: pInput.reason },
  });

  return recomputeSeasonRatings({
    adminProfile: pInput.adminProfile,
    reason: `after_admin_cancel:${match.id}`,
  });
}

export async function listValidatedMatchesForAdmin(): Promise<
  Array<{ id: string; playedAt: string; validatedAt: string; player1Id: string; player2Id: string }>
> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("id, played_at, validated_at, player1_id, player2_id")
    .eq("status", "validated")
    .order("validated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    id: string;
    played_at: string;
    validated_at: string;
    player1_id: string;
    player2_id: string;
  }>).map((pRow) => ({
    id: pRow.id,
    playedAt: pRow.played_at,
    validatedAt: pRow.validated_at,
    player1Id: pRow.player1_id,
    player2Id: pRow.player2_id,
  }));
}
