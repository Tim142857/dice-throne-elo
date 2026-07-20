import { computeRecords, type RecordMatchFact } from "@/domain/records/compute";
import {
  mapMatchProposalRow,
  mapMatchRow,
  type MatchDbRow,
  type MatchProposalDbRow,
} from "@/lib/mappers/match";
import { mapProfileRow, type ProfileDbRow } from "@/lib/mappers/account";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

export async function loadRecordMatchFacts(): Promise<RecordMatchFact[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "validated")
    .eq("season_id", SEED_IDS.globalSeasonId)
    .order("validated_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const matches = ((data ?? []) as MatchDbRow[])
    .map(mapMatchRow)
    .filter((pMatch) => pMatch.currentProposalId && pMatch.validatedAt);

  if (matches.length === 0) {
    return [];
  }

  const proposalIds = matches.map((pMatch) => pMatch.currentProposalId!);
  const matchIds = matches.map((pMatch) => pMatch.id);

  const [proposalsResponse, eventsResponse] = await Promise.all([
    supabase.from("match_proposals").select("*").in("id", proposalIds),
    supabase
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

  const facts: RecordMatchFact[] = [];
  for (const match of matches) {
    const proposal = proposalsById.get(match.currentProposalId!);
    if (!proposal || !match.validatedAt) {
      continue;
    }
    const events = eventsByMatch.get(match.id) ?? [];
    const event1 = events.find((pEvent) => pEvent.profile_id === proposal.player1Id);
    const event2 = events.find((pEvent) => pEvent.profile_id === proposal.player2Id);

    // Winner HP was always stored; historical loser HP may be reconstructed.
    // PV records use winnerRemainingHealth only — treat as reliable when present.
    const pvReliable = Number.isFinite(proposal.winnerRemainingHealth);

    facts.push({
      matchId: match.id,
      validatedAt: match.validatedAt,
      playedAt: proposal.playedAt,
      player1Id: proposal.player1Id,
      player2Id: proposal.player2Id,
      hero1Id: proposal.hero1Id,
      hero2Id: proposal.hero2Id,
      winnerProfileId: proposal.winnerProfileId,
      winnerRemainingHealth: proposal.winnerRemainingHealth,
      pvReliable,
      player1EloBefore: event1 ? toNumber(event1.rating_before) : null,
      player2EloBefore: event2 ? toNumber(event2.rating_before) : null,
      player1EloAfter: event1 ? toNumber(event1.rating_after) : null,
      player2EloAfter: event2 ? toNumber(event2.rating_after) : null,
      player1EloChange: event1 ? toNumber(event1.rating_change) : null,
      player2EloChange: event2 ? toNumber(event2.rating_change) : null,
    });
  }

  return facts;
}

export async function listPublicRecords() {
  const facts = await loadRecordMatchFacts();
  const records = computeRecords(facts);
  const profileIds = [
    ...new Set(
      records.flatMap((pRecord) =>
        pRecord.holders.flatMap((pHolder) => [
          ...(pHolder.profileId ? [pHolder.profileId] : []),
          ...pHolder.relatedProfileIds,
        ]),
      ),
    ),
  ];

  const supabase = await createSupabaseServerClient();
  const profilesById = new Map<string, { pseudo: string; slug: string }>();
  if (profileIds.length > 0) {
    const { data, error } = await supabase.from("profiles").select("*").in("id", profileIds);
    if (error) {
      throw new Error(error.message);
    }
    for (const row of (data ?? []) as ProfileDbRow[]) {
      const profile = mapProfileRow(row);
      profilesById.set(profile.id, { pseudo: profile.pseudo, slug: profile.slug });
    }
  }

  return records.map((pRecord) => ({
    ...pRecord,
    holders: pRecord.holders.map((pHolder) => ({
      ...pHolder,
      profile: pHolder.profileId ? (profilesById.get(pHolder.profileId) ?? null) : null,
      relatedProfiles: pHolder.relatedProfileIds.map(
        (pId) => profilesById.get(pId) ?? { pseudo: "?", slug: "" },
      ),
    })),
  }));
}
