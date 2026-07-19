/**
 * Normalize a display string for case-insensitive uniqueness checks.
 * Mirrors `public.normalize_text` in SQL (ASCII lowercasing + space collapse).
 */
export function normalizeText(pValue: string): string {
  return pValue.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

/**
 * Build a URL-safe slug. Mirrors `public.slugify` in SQL as closely as possible.
 */
export function slugify(pValue: string): string {
  const withoutDiacritics = normalizeText(pValue)
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

  return withoutDiacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}
