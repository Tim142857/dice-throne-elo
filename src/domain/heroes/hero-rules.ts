/**
 * Inactive heroes remain visible in history but cannot be picked for new matches.
 */
export function isHeroSelectableForNewMatch(pIsActive: boolean): boolean {
  return pIsActive;
}

export function sortHeroesByName<T extends { name: string }>(pHeroes: T[]): T[] {
  return [...pHeroes].sort((pLeft, pRight) =>
    pLeft.name.localeCompare(pRight.name, "fr", { sensitivity: "base" }),
  );
}
