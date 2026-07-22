import type { UnlockedAchievement } from "@/domain/achievements/evaluate";
import {
  buildAchievementUnlockedEvent,
  buildNotableMatchEvent,
  buildRecordBrokenEvent,
  formatRecordValue,
  isTopClash,
  isUpsetDeficit,
} from "@/domain/activity/copy";
import type { ActivityEventInput } from "@/domain/activity/types";
import { insertActivityEvents } from "@/lib/activity/service";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { listPublicRecords } from "@/lib/records/service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { SEED_IDS, type MatchProposalRow } from "@/types/database";

function toNumber(pValue: string | number): number {
  return typeof pValue === "number" ? pValue : Number(pValue);
}

async function loadPseudos(pProfileIds: string[]): Promise<Map<string, { pseudo: string; slug: string }>> {
  if (pProfileIds.length === 0) {
    return new Map();
  }
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, pseudo, slug")
    .in("id", pProfileIds);
  if (error) {
    throw new Error(error.message);
  }
  return new Map(
    ((data ?? []) as Array<{ id: string; pseudo: string; slug: string }>).map((pRow) => [
      pRow.id,
      { pseudo: pRow.pseudo, slug: pRow.slug },
    ]),
  );
}

async function loadGeneralRanksBeforeMatch(
  pProfileIds: string[],
): Promise<Map<string, number>> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("player_ratings")
    .select("profile_id, rating")
    .eq("season_id", SEED_IDS.globalSeasonId)
    .order("rating", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const ranks = new Map<string, number>();
  let rank = 0;
  let lastRating: number | null = null;
  let index = 0;
  for (const row of (data ?? []) as Array<{ profile_id: string; rating: string | number }>) {
    index += 1;
    const rating = toNumber(row.rating);
    if (lastRating === null || rating !== lastRating) {
      rank = index;
      lastRating = rating;
    }
    if (pProfileIds.includes(row.profile_id)) {
      ranks.set(row.profile_id, rank);
    }
  }
  return ranks;
}

/**
 * Publish public feed events for a newly validated match.
 * Never throws to the caller — failures are swallowed after logging.
 */
export async function emitActivityForValidatedMatch(pInput: {
  matchId: string;
  proposal: MatchProposalRow;
  occurredAt: string;
  unlocks: {
    player1: UnlockedAchievement[];
    player2: UnlockedAchievement[];
  };
}): Promise<void> {
  try {
    const events: ActivityEventInput[] = [];
    const admin = createSupabaseAdminClient();
    const profiles = await loadPseudos([pInput.proposal.player1Id, pInput.proposal.player2Id]);
    const p1 = profiles.get(pInput.proposal.player1Id);
    const p2 = profiles.get(pInput.proposal.player2Id);
    if (!p1 || !p2) {
      return;
    }

    for (const unlock of pInput.unlocks.player1) {
      events.push(
        buildAchievementUnlockedEvent({
          profileId: pInput.proposal.player1Id,
          pseudo: p1.pseudo,
          slug: p1.slug,
          achievementCode: unlock.code,
          matchId: unlock.triggerMatchId ?? pInput.matchId,
          occurredAt: pInput.occurredAt,
        }),
      );
    }
    for (const unlock of pInput.unlocks.player2) {
      events.push(
        buildAchievementUnlockedEvent({
          profileId: pInput.proposal.player2Id,
          pseudo: p2.pseudo,
          slug: p2.slug,
          achievementCode: unlock.code,
          matchId: unlock.triggerMatchId ?? pInput.matchId,
          occurredAt: pInput.occurredAt,
        }),
      );
    }

    const isDraw = pInput.proposal.winnerProfileId === null;
    if (!isDraw && pInput.proposal.winnerProfileId) {
      const { data: ratingEvents, error: eventsError } = await admin
        .from("rating_events")
        .select("profile_id, rating_before")
        .eq("match_id", pInput.matchId)
        .eq("rating_type", "general");

      if (eventsError) {
        throw new Error(eventsError.message);
      }

      const beforeByProfile = new Map(
        ((ratingEvents ?? []) as Array<{ profile_id: string; rating_before: string | number }>).map(
          (pRow) => [pRow.profile_id, toNumber(pRow.rating_before)],
        ),
      );
      const winnerId = pInput.proposal.winnerProfileId;
      const loserId =
        winnerId === pInput.proposal.player1Id
          ? pInput.proposal.player2Id
          : pInput.proposal.player1Id;
      const winnerBefore = beforeByProfile.get(winnerId);
      const loserBefore = beforeByProfile.get(loserId);
      const winnerPseudo = winnerId === pInput.proposal.player1Id ? p1.pseudo : p2.pseudo;
      const loserPseudo = loserId === pInput.proposal.player1Id ? p1.pseudo : p2.pseudo;

      if (winnerBefore !== undefined && loserBefore !== undefined) {
        const deficit = isUpsetDeficit(winnerBefore, loserBefore);
        if (deficit !== null) {
          events.push(
            buildNotableMatchEvent({
              matchId: pInput.matchId,
              winnerPseudo,
              winnerProfileId: winnerId,
              loserPseudo,
              loserProfileId: loserId,
              kind: "upset",
              eloDeficit: deficit,
              occurredAt: pInput.occurredAt,
            }),
          );
        }
      }

      // Ranks reflect post-match ratings; good enough for "top clash" signal.
      const ranks = await loadGeneralRanksBeforeMatch([winnerId, loserId]);
      const winnerRank = ranks.get(winnerId) ?? null;
      const loserRank = ranks.get(loserId) ?? null;
      if (isTopClash(winnerRank, loserRank)) {
        events.push(
          buildNotableMatchEvent({
            matchId: pInput.matchId,
            winnerPseudo,
            winnerProfileId: winnerId,
            loserPseudo,
            loserProfileId: loserId,
            kind: "top_clash",
            ...(winnerRank !== null ? { winnerRank } : {}),
            ...(loserRank !== null ? { loserRank } : {}),
            occurredAt: pInput.occurredAt,
          }),
        );
      }
    }

    try {
      const records = await listPublicRecords();
      for (const record of records) {
        for (const holder of record.holders) {
          if (holder.relatedMatchId !== pInput.matchId) {
            continue;
          }
          const profileId = holder.profileId;
          const profile = profileId
            ? profiles.get(profileId) ??
              (await loadPseudos([profileId])).get(profileId)
            : null;
          const pseudo = profile?.pseudo ?? "Un joueur";
          events.push(
            buildRecordBrokenEvent({
              recordCode: record.code,
              profileId,
              pseudo,
              matchId: pInput.matchId,
              valueLabel: formatRecordValue(record.code, holder.value),
              occurredAt: pInput.occurredAt,
              slug: profile?.slug ?? null,
            }),
          );
        }
      }
    } catch {
      // Records feed is best-effort.
    }

    await insertActivityEvents(events);
  } catch (pError) {
    console.error("activity feed emit failed", pError);
  }
}

export async function emitActivityForPlayerJoined(pInput: {
  profileId: string;
  occurredAt?: string;
}): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("*")
      .eq("id", pInput.profileId)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Profil introuvable.");
    }
    const profile = mapProfileRow(data as ProfileDbRow);
    const { buildPlayerJoinedEvent } = await import("@/domain/activity/copy");
    await insertActivityEvents([
      buildPlayerJoinedEvent({
        profileId: profile.id,
        pseudo: profile.pseudo,
        slug: profile.slug,
        occurredAt: pInput.occurredAt ?? new Date().toISOString(),
      }),
    ]);
  } catch (pError) {
    console.error("activity feed player joined emit failed", pError);
  }
}
