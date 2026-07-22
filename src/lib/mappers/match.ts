import type { MatchActionType } from "@/types/database";
import type { MatchStatus } from "@/types/domain";
import type { MatchProposalRow, MatchRow } from "@/types/database";

export type MatchDbRow = {
  id: string;
  season_id: string;
  created_by_profile_id: string;
  player1_id: string;
  player2_id: string;
  current_proposal_id: string | null;
  status: MatchStatus;
  played_at: string;
  validated_at: string | null;
  validated_by_profile_id: string | null;
  cancelled_at: string | null;
  import_source_key: string | null;
  achievements_eligible?: boolean;
  created_at: string;
  updated_at: string;
};

export type MatchProposalDbRow = {
  id: string;
  match_id: string;
  version_number: number;
  proposed_by_profile_id: string;
  player1_id: string;
  hero1_id: string;
  player2_id: string;
  hero2_id: string;
  winner_profile_id: string | null;
  winner_remaining_health: number;
  player1_remaining_health: number;
  player2_remaining_health: number;
  notes: string | null;
  played_at: string;
  created_at: string;
};

export type MatchActionDbRow = {
  id: string;
  match_id: string;
  actor_profile_id: string | null;
  action_type: MatchActionType;
  from_status: MatchStatus | null;
  to_status: MatchStatus;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export function mapMatchRow(pRow: MatchDbRow): MatchRow {
  return {
    id: pRow.id,
    seasonId: pRow.season_id,
    createdByProfileId: pRow.created_by_profile_id,
    player1Id: pRow.player1_id,
    player2Id: pRow.player2_id,
    currentProposalId: pRow.current_proposal_id,
    status: pRow.status,
    playedAt: pRow.played_at,
    validatedAt: pRow.validated_at,
    validatedByProfileId: pRow.validated_by_profile_id,
    cancelledAt: pRow.cancelled_at,
    importSourceKey: pRow.import_source_key,
    achievementsEligible: pRow.achievements_eligible ?? true,
    createdAt: pRow.created_at,
    updatedAt: pRow.updated_at,
  };
}

export function mapMatchProposalRow(pRow: MatchProposalDbRow): MatchProposalRow {
  return {
    id: pRow.id,
    matchId: pRow.match_id,
    versionNumber: pRow.version_number,
    proposedByProfileId: pRow.proposed_by_profile_id,
    player1Id: pRow.player1_id,
    hero1Id: pRow.hero1_id,
    player2Id: pRow.player2_id,
    hero2Id: pRow.hero2_id,
    winnerProfileId: pRow.winner_profile_id,
    winnerRemainingHealth: pRow.winner_remaining_health,
    player1RemainingHealth: pRow.player1_remaining_health,
    player2RemainingHealth: pRow.player2_remaining_health,
    notes: pRow.notes,
    playedAt: pRow.played_at,
    createdAt: pRow.created_at,
  };
}
