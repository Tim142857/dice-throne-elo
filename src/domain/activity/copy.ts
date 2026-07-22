import { getAchievementDefinition } from "@/domain/achievements/definitions";
import { RECORD_DEFINITIONS } from "@/domain/records/compute";
import {
  ACTIVITY_TOP_CLASH_RANK,
  ACTIVITY_UPSET_MIN_DEFICIT,
  type ActivityEventInput,
} from "@/domain/activity/types";

export function buildAchievementUnlockedEvent(pInput: {
  profileId: string;
  pseudo: string;
  slug: string;
  achievementCode: string;
  matchId: string | null;
  occurredAt: string;
}): ActivityEventInput {
  const definition = getAchievementDefinition(pInput.achievementCode);
  const name = definition?.name ?? pInput.achievementCode;
  return {
    type: "achievement_unlocked",
    occurredAt: pInput.occurredAt,
    actorProfileId: pInput.profileId,
    relatedProfileIds: [pInput.profileId],
    relatedMatchId: pInput.matchId,
    title: "Nouveau badge",
    message: `${pInput.pseudo} a débloqué « ${name} ».`,
    href: `/joueurs/${pInput.slug}`,
    metadata: {
      achievementCode: pInput.achievementCode,
      achievementName: name,
    },
  };
}

export function buildPlayerJoinedEvent(pInput: {
  profileId: string;
  pseudo: string;
  slug: string;
  occurredAt: string;
}): ActivityEventInput {
  return {
    type: "player_joined",
    occurredAt: pInput.occurredAt,
    actorProfileId: pInput.profileId,
    relatedProfileIds: [pInput.profileId],
    title: "Nouveau joueur",
    message: `${pInput.pseudo} a rejoint le classement.`,
    href: `/joueurs/${pInput.slug}`,
    metadata: {},
  };
}

export function buildNotableMatchEvent(pInput: {
  matchId: string;
  winnerPseudo: string;
  winnerProfileId: string;
  loserPseudo: string;
  loserProfileId: string;
  kind: "upset" | "top_clash";
  eloDeficit?: number;
  winnerRank?: number;
  loserRank?: number;
  occurredAt: string;
}): ActivityEventInput {
  if (pInput.kind === "upset") {
    const deficit = Math.round(pInput.eloDeficit ?? 0);
    return {
      type: "notable_match",
      occurredAt: pInput.occurredAt,
      actorProfileId: pInput.winnerProfileId,
      relatedProfileIds: [pInput.winnerProfileId, pInput.loserProfileId],
      relatedMatchId: pInput.matchId,
      title: "Gros upset",
      message: `${pInput.winnerPseudo} a battu ${pInput.loserPseudo} avec ${deficit} Elo de retard.`,
      href: `/matchs#match-${pInput.matchId}`,
      metadata: {
        kind: "upset",
        eloDeficit: deficit,
      },
    };
  }

  return {
    type: "notable_match",
    occurredAt: pInput.occurredAt,
    actorProfileId: pInput.winnerProfileId,
    relatedProfileIds: [pInput.winnerProfileId, pInput.loserProfileId],
    relatedMatchId: pInput.matchId,
    title: "Duel au sommet",
    message: `${pInput.winnerPseudo} (#${pInput.winnerRank}) a battu ${pInput.loserPseudo} (#${pInput.loserRank}).`,
    href: `/matchs#match-${pInput.matchId}`,
    metadata: {
      kind: "top_clash",
      winnerRank: pInput.winnerRank ?? null,
      loserRank: pInput.loserRank ?? null,
    },
  };
}

export function buildRecordBrokenEvent(pInput: {
  recordCode: string;
  profileId: string | null;
  pseudo: string;
  matchId: string | null;
  valueLabel: string;
  occurredAt: string;
  slug?: string | null;
}): ActivityEventInput {
  const definition = RECORD_DEFINITIONS.find((pItem) => pItem.code === pInput.recordCode);
  const title = definition?.title ?? pInput.recordCode;
  return {
    type: "record_broken",
    occurredAt: pInput.occurredAt,
    actorProfileId: pInput.profileId,
    relatedProfileIds: pInput.profileId ? [pInput.profileId] : [],
    relatedMatchId: pInput.matchId,
    title: "Record battu",
    message: `${pInput.pseudo} détient désormais « ${title} » (${pInput.valueLabel}).`,
    href: pInput.slug ? `/joueurs/${pInput.slug}` : "/records",
    metadata: {
      recordCode: pInput.recordCode,
      recordTitle: title,
    },
  };
}

export function isUpsetDeficit(pWinnerEloBefore: number, pLoserEloBefore: number): number | null {
  const deficit = pLoserEloBefore - pWinnerEloBefore;
  if (deficit < ACTIVITY_UPSET_MIN_DEFICIT) {
    return null;
  }
  return deficit;
}

export function isTopClash(
  pWinnerRank: number | null,
  pLoserRank: number | null,
  pLimit = ACTIVITY_TOP_CLASH_RANK,
): boolean {
  if (pWinnerRank === null || pLoserRank === null) {
    return false;
  }
  return pWinnerRank <= pLimit && pLoserRank <= pLimit;
}

export function formatRecordValue(pCode: string, pValue: number): string {
  if (pCode === "highest_elo" || pCode === "largest_single_elo_gain" || pCode === "best_ten_match_progression") {
    return `${Math.round(pValue)} Elo`;
  }
  if (pCode === "closest_win" || pCode === "largest_win") {
    return `${Math.round(pValue)} PV`;
  }
  if (pCode === "biggest_upset") {
    return `−${Math.round(pValue)} Elo`;
  }
  return String(Math.round(pValue));
}
