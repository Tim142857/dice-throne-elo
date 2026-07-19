import { describe, expect, it } from "vitest";

import { isHeroSelectableForNewMatch, sortHeroesByName } from "@/domain/heroes/hero-rules";

describe("isHeroSelectableForNewMatch", () => {
  it("allows only active heroes", () => {
    expect(isHeroSelectableForNewMatch(true)).toBe(true);
    expect(isHeroSelectableForNewMatch(false)).toBe(false);
  });
});

describe("sortHeroesByName", () => {
  it("sorts heroes with French collation", () => {
    const sorted = sortHeroesByName([{ name: "Wolverine" }, { name: "Artificier" }, { name: "Élfe" }]);
    expect(sorted.map((pHero) => pHero.name)).toEqual(["Artificier", "Élfe", "Wolverine"]);
  });
});
