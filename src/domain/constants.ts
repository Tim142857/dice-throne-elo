export const APP_NAME = "Dice Throne Elo";

export const PLAYER_ELO = {
  initialRating: 1000,
  kFactor: 32,
} as const;

export const PLAYER_HERO_ELO = {
  initialRating: 1000,
  kFactor: 40,
} as const;

export const PSEUDO_RULES = {
  minLength: 3,
  maxLength: 24,
  /** Letters, digits, single spaces, hyphens and underscores. */
  pattern: /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/,
} as const;

export const MATCH_RULES = {
  minRemainingHealth: 0,
  maxRemainingHealth: 50,
  maxNotesLength: 500,
} as const;
