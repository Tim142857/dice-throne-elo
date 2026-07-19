import { describe, expect, it } from "vitest";

import { createHeroSchema, heroNameSchema, normalizeHeroName } from "@/validation/hero";

describe("heroNameSchema", () => {
  it("accepts accented hero names", () => {
    const result = heroNameSchema.safeParse("Séraphine");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("Séraphine");
    }
  });

  it("rejects a name that is too short", () => {
    expect(heroNameSchema.safeParse("A").success).toBe(false);
  });
});

describe("normalizeHeroName", () => {
  it("normalizes for uniqueness checks", () => {
    expect(normalizeHeroName("  Elfe   Lunaire ")).toBe("elfe lunaire");
  });
});

describe("createHeroSchema", () => {
  it("parses form-like active flags", () => {
    const result = createHeroSchema.safeParse({ name: "Barbare", isActive: "true" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
    }
  });
});
