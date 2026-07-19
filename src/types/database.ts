import type {
  AccountStatus,
  MatchStatus,
  ProfileRole,
  RatingType,
} from "@/types/domain";

export type AccountRequestStatus = "pending" | "approved" | "rejected";

export type MatchActionType =
  | "created"
  | "updated"
  | "cancelledByCreator"
  | "validatedByOpponent"
  | "rejectedByOpponent"
  | "correctionProposed"
  | "correctionAccepted"
  | "correctionRejected"
  | "disputed"
  | "resolvedByAdmin"
  | "cancelledByAdmin";

export type NotificationType =
  | "accountApproved"
  | "accountRejected"
  | "matchPendingValidation"
  | "matchValidated"
  | "matchRejected"
  | "correctionProposed"
  | "correctionAccepted"
  | "correctionRejected"
  | "matchDisputed"
  | "adminDecision";

export type SeasonRow = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type ProfileRow = {
  id: string;
  authUserId: string | null;
  pseudo: string;
  normalizedPseudo: string;
  slug: string;
  status: AccountStatus;
  role: ProfileRole;
  createdAt: string;
  approvedAt: string | null;
  suspendedAt: string | null;
};

export type AccountRequestRow = {
  id: string;
  authUserId: string;
  requestedPseudo: string;
  normalizedPseudo: string;
  presentationMessage: string | null;
  status: AccountRequestStatus;
  linkedProfileId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type HeroRow = {
  id: string;
  name: string;
  normalizedName: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MatchRow = {
  id: string;
  seasonId: string;
  createdByProfileId: string;
  player1Id: string;
  player2Id: string;
  currentProposalId: string | null;
  status: MatchStatus;
  playedAt: string;
  validatedAt: string | null;
  validatedByProfileId: string | null;
  cancelledAt: string | null;
  importSourceKey: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MatchProposalRow = {
  id: string;
  matchId: string;
  versionNumber: number;
  proposedByProfileId: string;
  player1Id: string;
  hero1Id: string;
  player2Id: string;
  hero2Id: string;
  winnerProfileId: string;
  winnerRemainingHealth: number;
  notes: string | null;
  playedAt: string;
  createdAt: string;
};

export type MatchActionRow = {
  id: string;
  matchId: string;
  actorProfileId: string | null;
  actionType: MatchActionType;
  fromStatus: MatchStatus | null;
  toStatus: MatchStatus;
  reason: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type PlayerRatingRow = {
  profileId: string;
  seasonId: string;
  rating: string;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  currentStreak: number;
  bestRating: string;
  worstRating: string | null;
  lastValidatedMatchAt: string | null;
  updatedAt: string;
};

export type PlayerHeroRatingRow = {
  profileId: string;
  heroId: string;
  seasonId: string;
  rating: string;
  matchesCount: number;
  winsCount: number;
  lossesCount: number;
  lastUsedAt: string | null;
  updatedAt: string;
};

export type RatingEventRow = {
  id: string;
  matchId: string;
  seasonId: string;
  profileId: string;
  heroId: string | null;
  ratingType: RatingType;
  ratingBefore: string;
  expectedScore: string;
  actualScore: string;
  ratingChange: string;
  ratingAfter: string;
  processedAt: string;
};

export type NotificationRow = {
  id: string;
  recipientProfileId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedMatchId: string | null;
  readAt: string | null;
  createdAt: string;
};

export type AuditLogRow = {
  id: string;
  actorProfileId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  beforeData: Record<string, unknown> | null;
  afterData: Record<string, unknown> | null;
  createdAt: string;
};

/** Stable IDs created by the seed migration. */
export const SEED_IDS = {
  globalSeasonId: "00000000-0000-4000-8000-000000000001",
  profiles: {
    ewenn: "10000000-0000-4000-8000-000000000001",
    lomig: "10000000-0000-4000-8000-000000000002",
    florine: "10000000-0000-4000-8000-000000000003",
    flo: "10000000-0000-4000-8000-000000000004",
    adrien: "10000000-0000-4000-8000-000000000005",
    tim: "10000000-0000-4000-8000-000000000006",
    anaelle: "10000000-0000-4000-8000-000000000007",
  },
} as const;

export const SEED_HERO_NAMES = [
  "Barbare",
  "Elfe lunaire",
  "Moine",
  "Paladin",
  "Pyromancienne",
  "Voleur de l’ombre",
  "Tréant",
  "Ninja",
  "As de la gâchette",
  "Samouraï",
  "Séraphine",
  "Reine vampire",
  "Artificier",
  "Pirate maudite",
  "Tacticien",
  "Chasseresse",
  "Krampus",
  "Père Noël",
  "Black Panther",
  "Captain Marvel",
  "Black Widow",
  "Dr Strange",
  "Thor",
  "Loki",
  "Spiderman",
  "Scarlet Witch",
  "Cyclope",
  "Gambit",
  "Malicia",
  "Jean Grey",
  "Iceberg",
  "Psylocke",
  "Tornade",
  "Wolverine",
] as const;
