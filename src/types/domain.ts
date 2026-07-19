export type AccountStatus =
  | "preloaded"
  | "pendingApproval"
  | "active"
  | "rejected"
  | "suspended";

export type MatchStatus =
  | "pendingOpponent"
  | "pendingCreatorConfirmation"
  | "validated"
  | "rejected"
  | "disputed"
  | "cancelled"
  | "cancelledByAdmin";

export type ProfileRole = "player" | "admin";

export type RatingType = "general" | "playerHero";
