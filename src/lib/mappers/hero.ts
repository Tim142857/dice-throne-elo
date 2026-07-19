import type { HeroRow } from "@/types/database";

export type HeroDbRow = {
  id: string;
  name: string;
  normalized_name: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export function mapHeroRow(pRow: HeroDbRow): HeroRow {
  return {
    id: pRow.id,
    name: pRow.name,
    normalizedName: pRow.normalized_name,
    slug: pRow.slug,
    isActive: pRow.is_active,
    createdAt: pRow.created_at,
    updatedAt: pRow.updated_at,
  };
}
