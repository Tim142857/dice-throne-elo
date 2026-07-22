import { describe, expect, it } from "vitest";

import {
  assignCompetitionRanks,
  computeBestWinStreak,
  computeWinRate,
  formatWinRate,
} from "@/domain/rankings/ranks";

describe("assignCompetitionRanks", () => {
  it("uses competition ranking 1,2,2,4 on exact ties", () => {
    const ranked = assignCompetitionRanks(
      [{ rating: 1100 }, { rating: 1050 }, { rating: 1050 }, { rating: 1000 }],
      (pItem) => pItem.rating,
    );
    expect(ranked.map((pItem) => pItem.rank)).toEqual([1, 2, 2, 4]);
  });

  it("does not tie on different decimal ratings", () => {
    const ranked = assignCompetitionRanks(
      [{ rating: 1000.4 }, { rating: 1000.1 }],
      (pItem) => pItem.rating,
    );
    expect(ranked.map((pItem) => pItem.rank)).toEqual([1, 2]);
  });
});

describe("win rate helpers", () => {
  it("formats win rate with one decimal", () => {
    expect(formatWinRate(1, 3)).toBe("33.3 %");
    expect(computeWinRate(0, 0)).toBeNull();
  });
});

describe("computeBestWinStreak", () => {
  it("tracks the longest consecutive win run", () => {
    expect(computeBestWinStreak([true, true, false, true, true, true, false])).toBe(3);
  });

  it("breaks the streak on draw", () => {
    expect(computeBestWinStreak([true, true, null, true])).toBe(2);
  });
});
