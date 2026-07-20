import { describe, expect, it } from "vitest";

import { normalizePseudo, pseudoSchema } from "@/validation/pseudo";
import { SEED_HERO_NAMES, SEED_IDS } from "@/types/database";

describe("normalizePseudo", () => {
  it("trims, collapses spaces and lowercases for uniqueness checks", () => {
    expect(normalizePseudo("  Tim   Extra  ")).toBe("tim extra");
  });
});

describe("pseudoSchema", () => {
  it("accepts a valid pseudo", () => {
    const result = pseudoSchema.safeParse("Ewenn");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Ewenn");
    }
  });

  it("rejects a pseudo that is too short", () => {
    const result = pseudoSchema.safeParse("Ab");
    expect(result.success).toBe(false);
  });

  it("rejects illegal characters", () => {
    const result = pseudoSchema.safeParse("Tim@Home");
    expect(result.success).toBe(false);
  });
});

describe("seed metadata", () => {
  it("lists the 44 heroes from the specifications", () => {
    expect(SEED_HERO_NAMES).toHaveLength(44);
  });

  it("exposes stable historical profile ids", () => {
    expect(Object.keys(SEED_IDS.profiles)).toHaveLength(7);
  });
});
