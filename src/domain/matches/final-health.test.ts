import { describe, expect, it } from "vitest";

import {
  formatMatchFinalHealthScore,
  getWinnerRemainingHealthFromFinalHealth,
  validateMatchFinalHealth,
} from "@/domain/matches/final-health";

describe("formatMatchFinalHealthScore", () => {
  it("formats player health as a scoreline", () => {
    expect(formatMatchFinalHealthScore(15, 0)).toBe("15 - 0");
    expect(formatMatchFinalHealthScore(12, 8)).toBe("12 - 8");
  });
});

describe("validateMatchFinalHealth", () => {
  const base = {
    player1Id: "p1",
    player2Id: "p2",
    winnerProfileId: "p1",
  };

  it("accepts a knockout", () => {
    expect(
      validateMatchFinalHealth({
        ...base,
        player1RemainingHealth: 15,
        player2RemainingHealth: 0,
      }),
    ).toBeNull();
  });

  it("accepts a timer win", () => {
    expect(
      validateMatchFinalHealth({
        ...base,
        player1RemainingHealth: 12,
        player2RemainingHealth: 8,
      }),
    ).toBeNull();
  });

  it("rejects equal non-zero health", () => {
    expect(
      validateMatchFinalHealth({
        ...base,
        player1RemainingHealth: 10,
        player2RemainingHealth: 10,
      }),
    ).not.toBeNull();
  });
});

describe("getWinnerRemainingHealthFromFinalHealth", () => {
  it("returns the winner side health", () => {
    expect(
      getWinnerRemainingHealthFromFinalHealth({
        player1Id: "p1",
        winnerProfileId: "p2",
        player1RemainingHealth: 3,
        player2RemainingHealth: 11,
      }),
    ).toBe(11);
  });
});
