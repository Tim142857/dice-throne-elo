import { ACHIEVEMENTS_RULES } from "@/domain/constants";

/**
 * Achievements use the declared match date (playedAt), never the import/validation date.
 * Eligible from ACHIEVEMENTS_RULES.eligibleFromPlayedOn inclusive (calendar day, local date string).
 */
export function isAchievementsEligibleByPlayedAt(pPlayedAt: string): boolean {
  const day = pPlayedAt.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return false;
  }
  return day >= ACHIEVEMENTS_RULES.eligibleFromPlayedOn;
}
