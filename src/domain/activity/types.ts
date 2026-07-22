export const ACTIVITY_EVENT_TYPES = [
  "achievement_unlocked",
  "player_joined",
  "notable_match",
  "record_broken",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/** Minimum Elo deficit (favorite − underdog) to publish an upset. */
export const ACTIVITY_UPSET_MIN_DEFICIT = 100;

/** Both players in this top-N by Elo → "sommet du classement". */
export const ACTIVITY_TOP_CLASH_RANK = 5;

export type ActivityEventInput = {
  type: ActivityEventType;
  occurredAt?: string;
  actorProfileId?: string | null;
  relatedProfileIds?: string[];
  relatedMatchId?: string | null;
  title: string;
  message: string;
  href?: string | null;
  metadata?: Record<string, unknown>;
};

export type ActivityEventRow = {
  id: string;
  type: ActivityEventType;
  occurredAt: string;
  actorProfileId: string | null;
  relatedProfileIds: string[];
  relatedMatchId: string | null;
  title: string;
  message: string;
  href: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};
