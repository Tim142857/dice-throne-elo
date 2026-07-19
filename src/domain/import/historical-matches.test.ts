import { describe, expect, it } from "vitest";

import {
  buildImportSourceKey,
  buildValidatedAtForImport,
  parseCsv,
  parseHistoricalMatchRow,
  rawRowsFromCsvMatrix,
} from "@/domain/import/historical-matches";

describe("parseCsv", () => {
  it("parses quoted commas", () => {
    expect(parseCsv('a,b\n"x,y",z\n')).toEqual([
      ["a", "b"],
      ["x,y", "z"],
    ]);
  });
});

describe("rawRowsFromCsvMatrix", () => {
  it("maps french-friendly headers", () => {
    const rows = rawRowsFromCsvMatrix([
      ["date", "joueur1", "heros1", "joueur2", "heros2", "vainqueur", "pv", "notes"],
      ["2024-01-01", "Tim", "Gambit", "Ewenn", "Thor", "Tim", "12", ""],
    ]);
    expect(Array.isArray(rows)).toBe(true);
    if (Array.isArray(rows)) {
      expect(rows[0]?.player1).toBe("Tim");
      expect(rows[0]?.hero2).toBe("Thor");
    }
  });
});

describe("parseHistoricalMatchRow", () => {
  it("accepts a valid row and builds a stable source key", () => {
    const parsed = parseHistoricalMatchRow({
      rowNumber: 2,
      playedAt: "2024-01-01",
      player1: "Tim",
      hero1: "Gambit",
      player2: "Ewenn",
      hero2: "Thor",
      winner: "Tim",
      winnerRemainingHealth: "10",
      notes: "",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.row.importSourceKey).toContain("import:v1:");
      expect(parsed.row.validatedAt).toBe(buildValidatedAtForImport("2024-01-01", 2));
    }
  });

  it("rejects an invalid winner", () => {
    const parsed = parseHistoricalMatchRow({
      rowNumber: 3,
      playedAt: "2024-01-01",
      player1: "Tim",
      hero1: "Gambit",
      player2: "Ewenn",
      hero2: "Thor",
      winner: "Flo",
      winnerRemainingHealth: "10",
      notes: "",
    });
    expect(parsed.ok).toBe(false);
  });

  it("keeps source keys stable for identical payloads", () => {
    const input = {
      playedAt: "2024-01-01",
      player1Pseudo: "Tim",
      hero1Name: "Gambit",
      player2Pseudo: "Ewenn",
      hero2Name: "Thor",
      winnerPseudo: "Tim",
      winnerRemainingHealth: 10,
      notes: null,
      rowNumber: 4,
    };
    expect(buildImportSourceKey(input)).toBe(buildImportSourceKey(input));
  });
});
