import { describe, expect, it } from "vitest";

import {
  aggregateHeroConfrontation,
  aggregateHeroStats,
  aggregatePlayerConfrontation,
  pickFavorableMatchups,
  type MatchFact,
} from "@/domain/stats/aggregates";

const base: MatchFact = {
  matchId: "m1",
  playedAt: "2024-01-01",
  validatedAt: "2024-01-01T10:00:00.000Z",
  player1Id: "p1",
  player2Id: "p2",
  hero1Id: "h1",
  hero2Id: "h2",
  winnerProfileId: "p1",
};

describe("aggregateHeroStats", () => {
  it("counts wins, players and matchups", () => {
    const stats = aggregateHeroStats([
      base,
      {
        ...base,
        matchId: "m2",
        validatedAt: "2024-01-02T10:00:00.000Z",
        winnerProfileId: "p2",
      },
    ]);
    expect(stats.get("h1")?.matchesCount).toBe(2);
    expect(stats.get("h1")?.winsCount).toBe(1);
    expect(stats.get("h1")?.distinctPlayers).toBe(1);
    expect(stats.get("h1")?.matchups[0]?.opponentHeroId).toBe("h2");
  });
});

describe("pickFavorableMatchups", () => {
  it("filters by minimum matches and ranks by win rate", () => {
    const result = pickFavorableMatchups(
      [
        {
          opponentHeroId: "a",
          wins: 1,
          losses: 0,
          matchesCount: 1,
          winRateLabel: "100 %",
        },
        {
          opponentHeroId: "b",
          wins: 8,
          losses: 2,
          matchesCount: 10,
          winRateLabel: "80 %",
        },
        {
          opponentHeroId: "c",
          wins: 1,
          losses: 9,
          matchesCount: 10,
          winRateLabel: "10 %",
        },
      ],
      5,
    );
    expect(result.favorable.map((pRow) => pRow.opponentHeroId)).toEqual(["b", "c"]);
    expect(result.unfavorable[0]?.opponentHeroId).toBe("c");
  });
});

describe("confrontations", () => {
  it("aggregates player head-to-head", () => {
    const result = aggregatePlayerConfrontation([base], "p1", "p2");
    expect(result.matchesCount).toBe(1);
    expect(result.winsA).toBe(1);
    expect(result.winsB).toBe(0);
  });

  it("aggregates hero head-to-head", () => {
    const result = aggregateHeroConfrontation([base], "h1", "h2");
    expect(result.matchesCount).toBe(1);
    expect(result.winsA).toBe(1);
    expect(result.players.size).toBe(2);
  });
});
