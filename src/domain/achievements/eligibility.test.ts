import { describe, expect, it } from "vitest";

import { isAchievementsEligibleByPlayedAt } from "@/domain/achievements/eligibility";

describe("isAchievementsEligibleByPlayedAt", () => {
  it("includes 19-07-2026 and later", () => {
    expect(isAchievementsEligibleByPlayedAt("2026-07-19")).toBe(true);
    expect(isAchievementsEligibleByPlayedAt("2026-07-19T18:00:00.000Z")).toBe(true);
    expect(isAchievementsEligibleByPlayedAt("2026-07-20")).toBe(true);
  });

  it("excludes dates before 19-07-2026", () => {
    expect(isAchievementsEligibleByPlayedAt("2026-07-18")).toBe(false);
    expect(isAchievementsEligibleByPlayedAt("2025-12-31")).toBe(false);
  });

  it("rejects invalid values", () => {
    expect(isAchievementsEligibleByPlayedAt("")).toBe(false);
    expect(isAchievementsEligibleByPlayedAt("not-a-date")).toBe(false);
  });
});
