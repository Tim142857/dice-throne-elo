import { describe, expect, it } from "vitest";

import {
  describeMatchOutcomeFromHealth,
  formatMatchFinalHealthScore,
  getWinnerRemainingHealthFromFinalHealth,
  resolveWinnerProfileIdFromHealth,
  validateMatchFinalHealth,
} from "@/domain/matches/final-health";

describe("formatMatchFinalHealthScore", () => {
  it("formats player health as a scoreline", () => {
    expect(formatMatchFinalHealthScore(15, 0)).toBe("15 - 0");
    expect(formatMatchFinalHealthScore(12, 8)).toBe("12 - 8");
  });
});

describe("resolveWinnerProfileIdFromHealth", () => {
  it("picks the side with more remaining health", () => {
    expect(
      resolveWinnerProfileIdFromHealth({
        player1Id: "p1",
        player2Id: "p2",
        player1RemainingHealth: 12,
        player2RemainingHealth: 8,
      }),
    ).toBe("p1");
    expect(
      resolveWinnerProfileIdFromHealth({
        player1Id: "p1",
        player2Id: "p2",
        player1RemainingHealth: 0,
        player2RemainingHealth: 5,
      }),
    ).toBe("p2");
  });

  it("returns null on equal health including 0-0", () => {
    expect(
      resolveWinnerProfileIdFromHealth({
        player1Id: "p1",
        player2Id: "p2",
        player1RemainingHealth: 10,
        player2RemainingHealth: 10,
      }),
    ).toBeNull();
    expect(
      resolveWinnerProfileIdFromHealth({
        player1Id: "p1",
        player2Id: "p2",
        player1RemainingHealth: 0,
        player2RemainingHealth: 0,
      }),
    ).toBeNull();
  });
});

describe("describeMatchOutcomeFromHealth", () => {
  it("labels draws and wins", () => {
    expect(
      describeMatchOutcomeFromHealth({
        player1Id: "p1",
        player2Id: "p2",
        player1Label: "Alice",
        player2Label: "Bob",
        player1RemainingHealth: 0,
        player2RemainingHealth: 0,
      }),
    ).toBe("Match nul");
    expect(
      describeMatchOutcomeFromHealth({
        player1Id: "p1",
        player2Id: "p2",
        player1Label: "Alice",
        player2Label: "Bob",
        player1RemainingHealth: 3,
        player2RemainingHealth: 0,
      }),
    ).toBe("Victoire — Alice");
  });
});

describe("validateMatchFinalHealth", () => {
  it("accepts any health pair once ranges are valid", () => {
    expect(
      validateMatchFinalHealth({
        player1Id: "p1",
        player2Id: "p2",
        winnerProfileId: null,
        player1RemainingHealth: 0,
        player2RemainingHealth: 0,
      }),
    ).toBeNull();
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

  it("returns shared health on draw", () => {
    expect(
      getWinnerRemainingHealthFromFinalHealth({
        player1Id: "p1",
        winnerProfileId: null,
        player1RemainingHealth: 0,
        player2RemainingHealth: 0,
      }),
    ).toBe(0);
  });
});
