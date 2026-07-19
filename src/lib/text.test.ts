import { describe, expect, it } from "vitest";

import { normalizeText, slugify } from "@/lib/text";

describe("normalizeText", () => {
  it("trims and collapses inner spaces", () => {
    expect(normalizeText("  Elfe   lunaire ")).toBe("elfe lunaire");
  });
});

describe("slugify", () => {
  it("slugifies accented hero names", () => {
    expect(slugify("Séraphine")).toBe("seraphine");
    expect(slugify("Père Noël")).toBe("pere-noel");
    expect(slugify("As de la gâchette")).toBe("as-de-la-gachette");
  });

  it("slugifies player pseudos", () => {
    expect(slugify("Ewenn")).toBe("ewenn");
  });
});
