import { sortHeroesByName } from "@/domain/heroes/hero-rules";
import { assertAdminProfile, writeAuditLog } from "@/lib/admin/audit";
import { mapHeroRow, type HeroDbRow } from "@/lib/mappers/hero";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/text";
import type { HeroRow, ProfileRow } from "@/types/database";
import {
  createHeroSchema,
  normalizeHeroName,
  setHeroActiveSchema,
  updateHeroSchema,
} from "@/validation/hero";

export async function listAllHeroes(): Promise<HeroRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("heroes").select("*").order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return sortHeroesByName(((data ?? []) as HeroDbRow[]).map(mapHeroRow));
}

export async function listActiveHeroes(): Promise<HeroRow[]> {
  const heroes = await listAllHeroes();
  return heroes.filter((pHero) => pHero.isActive);
}

export async function getHeroBySlug(pSlug: string): Promise<HeroRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("heroes").select("*").eq("slug", pSlug).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapHeroRow(data as HeroDbRow) : null;
}

async function assertHeroNameAvailable(pNormalizedName: string, pExcludeHeroId?: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("heroes").select("id").eq("normalized_name", pNormalizedName);
  if (pExcludeHeroId) {
    query = query.neq("id", pExcludeHeroId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    throw new Error("Un héros porte déjà ce nom.");
  }
}

async function assertHeroSlugAvailable(pSlug: string, pExcludeHeroId?: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  let query = admin.from("heroes").select("id").eq("slug", pSlug);
  if (pExcludeHeroId) {
    query = query.neq("id", pExcludeHeroId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (data) {
    throw new Error("Ce slug de héros est déjà utilisé.");
  }
}

export async function createHero(pInput: {
  adminProfile: ProfileRow;
  name: string;
  isActive: boolean;
}): Promise<HeroRow> {
  assertAdminProfile(pInput.adminProfile);
  const parsed = createHeroSchema.safeParse({
    name: pInput.name,
    isActive: pInput.isActive,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  const normalizedName = normalizeHeroName(parsed.data.name);
  const slug = slugify(parsed.data.name);
  if (!slug) {
    throw new Error("Impossible de générer un slug pour ce nom.");
  }

  await assertHeroNameAvailable(normalizedName);
  await assertHeroSlugAvailable(slug);

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("heroes")
    .insert({
      name: parsed.data.name,
      normalized_name: normalizedName,
      slug,
      is_active: parsed.data.isActive,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de créer le héros.");
  }

  const hero = mapHeroRow(data as HeroDbRow);
  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "hero.created",
    entityType: "hero",
    entityId: hero.id,
    afterData: {
      name: hero.name,
      slug: hero.slug,
      isActive: hero.isActive,
    },
  });

  return hero;
}

export async function updateHero(pInput: {
  adminProfile: ProfileRow;
  heroId: string;
  name: string;
  isActive: boolean;
}): Promise<HeroRow> {
  assertAdminProfile(pInput.adminProfile);
  const parsed = updateHeroSchema.safeParse({
    heroId: pInput.heroId,
    name: pInput.name,
    isActive: pInput.isActive,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  const admin = createSupabaseAdminClient();
  const beforeResponse = await admin.from("heroes").select("*").eq("id", parsed.data.heroId).single();
  if (beforeResponse.error || !beforeResponse.data) {
    throw new Error("Héros introuvable.");
  }

  const before = mapHeroRow(beforeResponse.data as HeroDbRow);
  const normalizedName = normalizeHeroName(parsed.data.name);
  const slug = slugify(parsed.data.name);
  if (!slug) {
    throw new Error("Impossible de générer un slug pour ce nom.");
  }

  await assertHeroNameAvailable(normalizedName, parsed.data.heroId);
  await assertHeroSlugAvailable(slug, parsed.data.heroId);

  const { data, error } = await admin
    .from("heroes")
    .update({
      name: parsed.data.name,
      normalized_name: normalizedName,
      slug,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.heroId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de modifier le héros.");
  }

  const hero = mapHeroRow(data as HeroDbRow);
  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: "hero.updated",
    entityType: "hero",
    entityId: hero.id,
    beforeData: {
      name: before.name,
      slug: before.slug,
      isActive: before.isActive,
    },
    afterData: {
      name: hero.name,
      slug: hero.slug,
      isActive: hero.isActive,
    },
  });

  return hero;
}

export async function setHeroActive(pInput: {
  adminProfile: ProfileRow;
  heroId: string;
  isActive: boolean;
}): Promise<HeroRow> {
  assertAdminProfile(pInput.adminProfile);
  const parsed = setHeroActiveSchema.safeParse({
    heroId: pInput.heroId,
    isActive: pInput.isActive,
  });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Données invalides.");
  }

  const admin = createSupabaseAdminClient();
  const beforeResponse = await admin.from("heroes").select("*").eq("id", parsed.data.heroId).single();
  if (beforeResponse.error || !beforeResponse.data) {
    throw new Error("Héros introuvable.");
  }

  const before = mapHeroRow(beforeResponse.data as HeroDbRow);
  const { data, error } = await admin
    .from("heroes")
    .update({ is_active: parsed.data.isActive })
    .eq("id", parsed.data.heroId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Impossible de mettre à jour le statut du héros.");
  }

  const hero = mapHeroRow(data as HeroDbRow);
  await writeAuditLog({
    actorProfileId: pInput.adminProfile.id,
    action: parsed.data.isActive ? "hero.activated" : "hero.deactivated",
    entityType: "hero",
    entityId: hero.id,
    beforeData: { isActive: before.isActive },
    afterData: { isActive: hero.isActive },
  });

  return hero;
}
