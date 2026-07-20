import { describe, expect, it } from "vitest";

import { computeRecords, type RecordMatchFact } from "@/domain/records/compute";
import { computePlayerHealthStats } from "@/domain/stats/health";

function fact(pPartial: Partial<RecordMatchFact> & Pick<RecordMatchFact, "matchId">): RecordMatchFact {
  return {
    validatedAt: "2026-07-18T12:00:00.000Z",
    playedAt: "2026-07-18",
    player1Id: "p1",
    player2Id: "p2",
    hero1Id: "h1",
    hero2Id: "h2",
    winnerProfileId: "p1",
    winnerRemainingHealth: 10,
    pvReliable: true,
    player1EloBefore: 1000,
    player2EloBefore: 1000,
    player1EloAfter: 1016,
    player2EloAfter: 984,
    player1EloChange: 16,
    player2EloChange: -16,
    ...pPartial,
  };
}

describe("computeRecords", () => {
  it("includes historical matches for non-PV records", () => {
    const records = computeRecords([
      fact({
        matchId: "hist",
        validatedAt: "2024-01-01T00:00:00.000Z",
        winnerProfileId: "p1",
        player1EloAfter: 1500,
      }),
    ]);
    const highest = records.find((pItem) => pItem.code === "highest_elo");
    expect(highest?.holders[0]?.profileId).toBe("p1");
    expect(highest?.holders[0]?.value).toBe(1500);
  });

  it("excludes unreliable PV matches only from PV records", () => {
    const records = computeRecords([
      fact({
        matchId: "no-pv",
        pvReliable: false,
        winnerRemainingHealth: null,
        player1EloAfter: 1200,
      }),
      fact({
        matchId: "with-pv",
        validatedAt: "2026-07-19T00:00:00.000Z",
        winnerRemainingHealth: 2,
        pvReliable: true,
      }),
    ]);
    const closest = records.find((pItem) => pItem.code === "closest_win");
    expect(closest?.holders).toHaveLength(1);
    expect(closest?.holders[0]?.relatedMatchId).toBe("with-pv");
    const highest = records.find((pItem) => pItem.code === "highest_elo");
    expect(highest?.holders.some((pHolder) => pHolder.value === 1200)).toBe(true);
  });

  it("keeps exact ties as co-holders", () => {
    const records = computeRecords([
      fact({
        matchId: "a",
        winnerProfileId: "p1",
        player1EloChange: 40,
      }),
      fact({
        matchId: "b",
        validatedAt: "2026-07-19T00:00:00.000Z",
        player1Id: "p3",
        player2Id: "p4",
        winnerProfileId: "p3",
        player1EloChange: 40,
        player2EloChange: -40,
        player1EloAfter: 1040,
        player2EloAfter: 960,
      }),
    ]);
    const gain = records.find((pItem) => pItem.code === "largest_single_elo_gain");
    expect(gain?.holders.length).toBeGreaterThanOrEqual(2);
  });

  it("treats rivalry pairs regardless of player order", () => {
    const records = computeRecords([
      fact({ matchId: "1", player1Id: "a", player2Id: "b" }),
      fact({
        matchId: "2",
        validatedAt: "2026-07-19T00:00:00.000Z",
        player1Id: "b",
        player2Id: "a",
      }),
    ]);
    const rivalry = records.find((pItem) => pItem.code === "most_frequent_rivalry");
    expect(rivalry?.holders[0]?.value).toBe(2);
    expect(new Set(rivalry?.holders[0]?.relatedProfileIds)).toEqual(new Set(["a", "b"]));
  });
});

describe("computePlayerHealthStats", () => {
  it("aggregates winner HP only", () => {
    const stats = computePlayerHealthStats("p1", [
      {
        matchId: "1",
        validatedAt: "a",
        winnerProfileId: "p1",
        winnerRemainingHealth: 10,
        pvReliable: true,
      },
      {
        matchId: "2",
        validatedAt: "b",
        winnerProfileId: "p1",
        winnerRemainingHealth: 20,
        pvReliable: true,
      },
      {
        matchId: "3",
        validatedAt: "c",
        winnerProfileId: "p2",
        winnerRemainingHealth: 1,
        pvReliable: true,
      },
    ]);
    expect(stats.averageWinnerHp).toBe(15);
    expect(stats.closestWinHp).toBe(10);
    expect(stats.largestWinHp).toBe(20);
    expect(stats.winsWithAtLeast20Hp).toBe(1);
  });
});
