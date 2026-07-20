import { describe, expect, it } from "vitest";

import { evaluateAchievementsForPlayer } from "@/domain/achievements/evaluate";
import type { AchievementMatchFact } from "@/domain/achievements/evaluate";

function match(pPartial: Partial<AchievementMatchFact> & Pick<AchievementMatchFact, "matchId">): AchievementMatchFact {
  return {
    validatedAt: "2026-07-20T10:00:00.000Z",
    achievementsEligible: true,
    player1Id: "p1",
    player2Id: "p2",
    hero1Id: "h1",
    hero2Id: "h2",
    winnerProfileId: "p1",
    winnerRemainingHealth: 10,
    player1EloBefore: 1000,
    player2EloBefore: 1000,
    player1EloAfter: 1016,
    player2EloAfter: 984,
    ...pPartial,
  };
}

describe("evaluateAchievementsForPlayer", () => {
  it("ignores non-eligible historical matches for badges and streaks", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1", "h2"],
      matches: [
        match({
          matchId: "hist-1",
          achievementsEligible: false,
          winnerProfileId: "p1",
          validatedAt: "2026-01-01T00:00:00.000Z",
        }),
        match({
          matchId: "hist-loss",
          achievementsEligible: false,
          winnerProfileId: "p2",
          validatedAt: "2026-01-02T00:00:00.000Z",
        }),
        match({
          matchId: "new-1",
          achievementsEligible: true,
          winnerProfileId: "p1",
          validatedAt: "2026-07-20T00:00:00.000Z",
        }),
      ],
    });

    expect(result.newlyUnlocked.map((pItem) => pItem.code)).toContain("first_win");
    expect(result.newlyUnlocked.map((pItem) => pItem.code)).not.toContain("matches_10");
    const matchesProgress = result.progress.find((pItem) => pItem.code === "matches_10");
    expect(matchesProgress?.current).toBe(1);
  });

  it("does not unlock anything from non-eligible matches alone", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1"],
      matches: [
        match({
          matchId: "hist",
          achievementsEligible: false,
          winnerProfileId: "p1",
          winnerRemainingHealth: 1,
          player1EloAfter: 2000,
        }),
      ],
    });
    expect(result.newlyUnlocked).toHaveLength(0);
  });

  it("unlocks cumulative underdog badges from exact deficit", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1"],
      matches: [
        match({
          matchId: "u1",
          winnerProfileId: "p1",
          player1EloBefore: 1000,
          player2EloBefore: 2000,
          player1EloAfter: 1040,
          player2EloAfter: 1960,
        }),
      ],
    });
    const codes = result.newlyUnlocked.map((pItem) => pItem.code);
    expect(codes).toEqual(expect.arrayContaining(["underdog_200", "underdog_500", "underdog_1000"]));
  });

  it("unlocks cumulative elo badges from exact rating after match", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1"],
      matches: [
        match({
          matchId: "e1",
          winnerProfileId: "p1",
          player1EloAfter: 2000,
        }),
      ],
    });
    const codes = result.newlyUnlocked.map((pItem) => pItem.code);
    expect(codes).toEqual(expect.arrayContaining(["elo_1200", "elo_1500", "elo_2000"]));
  });

  it("requires distinct hero wins for diversity badges", () => {
    const matches = Array.from({ length: 5 }, (_, pIndex) =>
      match({
        matchId: `w-${pIndex}`,
        hero1Id: "h1",
        winnerProfileId: "p1",
        validatedAt: `2026-07-2${pIndex}T00:00:00.000Z`,
      }),
    );
    const sameHero = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1", "h2", "h3", "h4", "h5"],
      matches,
    });
    expect(sameHero.newlyUnlocked.map((pItem) => pItem.code)).not.toContain("hero_wins_5");

    const diverse = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1", "h2", "h3", "h4", "h5"],
      matches: matches.map((pMatch, pIndex) => ({
        ...pMatch,
        hero1Id: `h${pIndex + 1}`,
      })),
    });
    expect(diverse.newlyUnlocked.map((pItem) => pItem.code)).toContain("hero_wins_5");
    expect(diverse.newlyUnlocked.map((pItem) => pItem.code)).toContain("hero_wins_all");
  });

  it("never awards the same badge twice", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(["first_win"]),
      activeHeroIds: ["h1"],
      matches: [match({ matchId: "m1", winnerProfileId: "p1" })],
    });
    expect(result.newlyUnlocked.map((pItem) => pItem.code)).not.toContain("first_win");
  });

  it("ignores ineligible losses when computing badge win streaks", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1"],
      matches: [
        match({
          matchId: "e1",
          winnerProfileId: "p1",
          validatedAt: "2026-07-01T00:00:00.000Z",
        }),
        match({
          matchId: "hist-loss",
          achievementsEligible: false,
          winnerProfileId: "p2",
          validatedAt: "2026-07-02T00:00:00.000Z",
        }),
        match({
          matchId: "e2",
          winnerProfileId: "p1",
          validatedAt: "2026-07-03T00:00:00.000Z",
        }),
        match({
          matchId: "e3",
          winnerProfileId: "p1",
          validatedAt: "2026-07-04T00:00:00.000Z",
        }),
      ],
    });
    expect(result.newlyUnlocked.map((pItem) => pItem.code)).toContain("win_streak_3");
  });

  it("unlocks health badges at exact thresholds", () => {
    const result = evaluateAchievementsForPlayer({
      profileId: "p1",
      alreadyUnlocked: new Set(),
      activeHeroIds: ["h1"],
      matches: [
        match({ matchId: "one", winnerRemainingHealth: 1 }),
        match({ matchId: "thirty", winnerRemainingHealth: 30, validatedAt: "2026-07-21T00:00:00.000Z" }),
      ],
    });
    const codes = result.newlyUnlocked.map((pItem) => pItem.code);
    expect(codes).toEqual(expect.arrayContaining(["win_one_hp", "win_thirty_hp"]));
  });
});
