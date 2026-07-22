import { describe, expect, it } from "vitest";

import {
  ratingsFingerprint,
  recomputeRatingsFromMatches,
  sortMatchesForRecompute,
} from "@/domain/elo/recompute";

const heroA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const heroB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const player1 = "11111111-1111-4111-8111-111111111111";
const player2 = "22222222-2222-4222-8222-222222222222";

describe("sortMatchesForRecompute", () => {
  it("orders by validatedAt then matchId", () => {
    const sorted = sortMatchesForRecompute([
      {
        matchId: "m2",
        validatedAt: "2024-01-02T10:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player1,
      },
      {
        matchId: "m1",
        validatedAt: "2024-01-01T10:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player2,
      },
      {
        matchId: "m0",
        validatedAt: "2024-01-02T10:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player1,
      },
    ]);

    expect(sorted.map((pMatch) => pMatch.matchId)).toEqual(["m1", "m0", "m2"]);
  });
});

describe("recomputeRatingsFromMatches", () => {
  it("rebuilds equal-rating first match to +/-16 general Elo", () => {
    const result = recomputeRatingsFromMatches([
      {
        matchId: "m1",
        validatedAt: "2024-01-01T12:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player1,
      },
    ]);

    const rating1 = result.playerRatings.find((pRow) => pRow.profileId === player1);
    const rating2 = result.playerRatings.find((pRow) => pRow.profileId === player2);
    expect(rating1?.rating).toBeCloseTo(1016, 10);
    expect(rating2?.rating).toBeCloseTo(984, 10);
    expect(rating1?.winsCount).toBe(1);
    expect(rating2?.lossesCount).toBe(1);
    expect(rating1?.drawsCount).toBe(0);
    expect(result.events).toHaveLength(4);
  });

  it("counts draws without awarding a win or loss", () => {
    const result = recomputeRatingsFromMatches([
      {
        matchId: "m1",
        validatedAt: "2024-01-01T12:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: null,
      },
    ]);

    const rating1 = result.playerRatings.find((pRow) => pRow.profileId === player1);
    const rating2 = result.playerRatings.find((pRow) => pRow.profileId === player2);
    expect(rating1?.matchesCount).toBe(1);
    expect(rating1?.winsCount).toBe(0);
    expect(rating1?.lossesCount).toBe(0);
    expect(rating1?.drawsCount).toBe(1);
    expect(rating1?.currentStreak).toBe(0);
    expect(rating2?.drawsCount).toBe(1);
    expect(result.events.every((pEvent) => pEvent.actualScore === 0.5)).toBe(true);
  });

  it("is deterministic for the same input set", () => {
    const matches = [
      {
        matchId: "m2",
        validatedAt: "2024-01-02T12:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player2,
      },
      {
        matchId: "m1",
        validatedAt: "2024-01-01T12:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player1,
      },
    ];

    const first = recomputeRatingsFromMatches(matches);
    const second = recomputeRatingsFromMatches([...matches].reverse());
    expect(ratingsFingerprint(first)).toBe(ratingsFingerprint(second));
    expect(first.orderedMatchIds).toEqual(["m1", "m2"]);
  });

  it("ignores match playedAt and only uses validatedAt order", () => {
    const result = recomputeRatingsFromMatches([
      {
        matchId: "late-declared-old-game",
        validatedAt: "2024-02-01T00:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player1,
      },
      {
        matchId: "recent-game-validated-first",
        validatedAt: "2024-01-01T00:00:00.000Z",
        player1Id: player1,
        player2Id: player2,
        hero1Id: heroA,
        hero2Id: heroB,
        winnerProfileId: player2,
      },
    ]);

    expect(result.orderedMatchIds[0]).toBe("recent-game-validated-first");
  });

  it("keeps baseline profiles at 1000 when they have no matches", () => {
    const spectator = "33333333-3333-4333-8333-333333333333";
    const result = recomputeRatingsFromMatches([], [spectator, player1]);
    expect(result.playerRatings).toHaveLength(2);
    expect(result.playerRatings.every((pRow) => pRow.rating === 1000)).toBe(true);
    expect(result.events).toHaveLength(0);
  });
});
