import { describe, expect, it } from "vitest";

import { PLAYER_ELO, PLAYER_HERO_ELO } from "@/domain/constants";
import {
  applyGeneralElo,
  applyPlayerHeroElo,
  applyTwoPlayerElo,
  computeExpectedScore,
  nextBestWinStreak,
  nextWinStreak,
  roundRatingForDisplay,
  updateBestAndWorstRatings,
} from "@/domain/elo/calculate";

describe("computeExpectedScore", () => {
  it("returns 0.5 when ratings are equal", () => {
    expect(computeExpectedScore(1000, 1000)).toBeCloseTo(0.5, 12);
  });
});

describe("applyTwoPlayerElo", () => {
  it("computes a draw-probability match at equal Elo (favorite N/A)", () => {
    const result = applyGeneralElo({
      ratingA: 1000,
      ratingB: 1000,
      winnerIsA: true,
    });

    expect(result.playerA.expectedScore).toBeCloseTo(0.5, 12);
    expect(result.playerA.ratingChange).toBeCloseTo(PLAYER_ELO.kFactor * 0.5, 12);
    expect(result.playerA.ratingAfter).toBeCloseTo(1000 + 16, 12);
    expect(result.playerB.ratingAfter).toBeCloseTo(1000 - 16, 12);
  });

  it("gives a smaller gain when the favorite wins", () => {
    const result = applyGeneralElo({
      ratingA: 1200,
      ratingB: 1000,
      winnerIsA: true,
    });

    expect(result.playerA.expectedScore).toBeGreaterThan(0.5);
    expect(result.playerA.ratingChange).toBeGreaterThan(0);
    expect(result.playerA.ratingChange).toBeLessThan(16);
    expect(result.playerB.ratingChange).toBeCloseTo(-result.playerA.ratingChange, 12);
  });

  it("gives a larger gain when the underdog wins", () => {
    const result = applyGeneralElo({
      ratingA: 1000,
      ratingB: 1200,
      winnerIsA: true,
    });

    expect(result.playerA.expectedScore).toBeLessThan(0.5);
    expect(result.playerA.ratingChange).toBeGreaterThan(16);
    expect(result.playerB.ratingChange).toBeCloseTo(-result.playerA.ratingChange, 12);
  });

  it("keeps exact opposite deltas before display rounding", () => {
    const result = applyTwoPlayerElo({
      ratingA: 1013.257891,
      ratingB: 987.111111,
      winnerIsA: false,
      kFactor: 32,
    });

    expect(result.playerB.ratingChange).toBe(-result.playerA.ratingChange);
    expect(result.playerA.ratingAfter + result.playerB.ratingAfter).toBeCloseTo(
      result.playerA.ratingBefore + result.playerB.ratingBefore,
      12,
    );
  });

  it("preserves decimals across chained calculations", () => {
    const first = applyGeneralElo({
      ratingA: 1000,
      ratingB: 1000,
      winnerIsA: true,
    });
    const second = applyGeneralElo({
      ratingA: first.playerA.ratingAfter,
      ratingB: first.playerB.ratingAfter,
      winnerIsA: true,
    });

    expect(Number.isInteger(second.playerA.ratingAfter)).toBe(false);
    expect(second.playerA.ratingAfter).not.toBe(roundRatingForDisplay(second.playerA.ratingAfter));
  });
});

describe("player-hero Elo independence", () => {
  it("uses K=40 and does not depend on general ratings", () => {
    const general = applyGeneralElo({
      ratingA: 1300,
      ratingB: 1100,
      winnerIsA: true,
    });
    const playerHero = applyPlayerHeroElo({
      ratingA: 1000,
      ratingB: 1000,
      winnerIsA: true,
    });

    expect(PLAYER_HERO_ELO.kFactor).toBe(40);
    expect(playerHero.playerA.ratingChange).toBeCloseTo(20, 12);
    expect(playerHero.playerA.ratingChange).not.toBeCloseTo(general.playerA.ratingChange, 6);
  });
});

describe("roundRatingForDisplay", () => {
  it("rounds to the nearest integer for display only", () => {
    expect(roundRatingForDisplay(1000.4)).toBe(1000);
    expect(roundRatingForDisplay(1000.5)).toBe(1001);
    expect(roundRatingForDisplay(999.5)).toBe(1000);
  });
});

describe("win streaks", () => {
  it("increments on wins and resets on loss", () => {
    expect(nextWinStreak(0, true)).toBe(1);
    expect(nextWinStreak(3, true)).toBe(4);
    expect(nextWinStreak(4, false)).toBe(0);
  });

  it("tracks the best win streak", () => {
    expect(nextBestWinStreak(2, 5)).toBe(5);
    expect(nextBestWinStreak(5, 3)).toBe(5);
  });
});

describe("updateBestAndWorstRatings", () => {
  it("sets worst rating after the first match", () => {
    expect(
      updateBestAndWorstRatings({
        previousBest: 1000,
        previousWorst: null,
        newRating: 1016,
        matchesCountBefore: 0,
      }),
    ).toEqual({ bestRating: 1016, worstRating: 1016 });
  });

  it("updates best and worst on later matches", () => {
    expect(
      updateBestAndWorstRatings({
        previousBest: 1016,
        previousWorst: 1016,
        newRating: 998.5,
        matchesCountBefore: 1,
      }),
    ).toEqual({ bestRating: 1016, worstRating: 998.5 });
  });
});
