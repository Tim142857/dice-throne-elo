import { z } from "zod";

import { PSEUDO_RULES } from "@/domain/constants";

export function normalizePseudo(pValue: string): string {
  return pValue.trim().replace(/\s+/g, " ").toLocaleLowerCase("fr-FR");
}

export const pseudoSchema = z
  .string()
  .trim()
  .min(PSEUDO_RULES.minLength, "Le pseudo doit contenir au moins 3 caractères.")
  .max(PSEUDO_RULES.maxLength, "Le pseudo doit contenir au plus 24 caractères.")
  .regex(
    PSEUDO_RULES.pattern,
    "Le pseudo n’accepte que des lettres, chiffres, espaces simples, tirets et underscores.",
  )
  .transform((pValue) => pValue.trim().replace(/\s+/g, " "));
