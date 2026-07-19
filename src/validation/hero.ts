import { z } from "zod";

import { normalizeText } from "@/lib/text";

export const HERO_NAME_RULES = {
  minLength: 2,
  maxLength: 48,
} as const;

export const heroNameSchema = z
  .string()
  .trim()
  .min(HERO_NAME_RULES.minLength, "Le nom du héros doit contenir au moins 2 caractères.")
  .max(HERO_NAME_RULES.maxLength, "Le nom du héros doit contenir au plus 48 caractères.")
  .refine((pValue) => pValue.replace(/\s+/g, " ").length >= HERO_NAME_RULES.minLength, {
    message: "Le nom du héros est invalide.",
  })
  .transform((pValue) => pValue.trim().replace(/\s+/g, " "));

export const createHeroSchema = z.object({
  name: heroNameSchema,
  isActive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((pValue) => pValue === true || pValue === "true"),
});

export const updateHeroSchema = z.object({
  heroId: z.string().uuid("Identifiant de héros invalide."),
  name: heroNameSchema,
  isActive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((pValue) => pValue === true || pValue === "true"),
});

export const setHeroActiveSchema = z.object({
  heroId: z.string().uuid("Identifiant de héros invalide."),
  isActive: z
    .union([z.literal("true"), z.literal("false"), z.boolean()])
    .transform((pValue) => pValue === true || pValue === "true"),
});

export function normalizeHeroName(pValue: string): string {
  return normalizeText(pValue);
}
