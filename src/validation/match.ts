import { z } from "zod";

import { MATCH_RULES } from "@/domain/constants";

const uuidSchema = z.string().uuid("Identifiant invalide.");

export const matchProposalFieldsSchema = z
  .object({
    playedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.")
      .refine((pValue) => pValue <= new Date().toISOString().slice(0, 10), {
        message: "La date du match ne peut pas être dans le futur.",
      }),
    player1Id: uuidSchema,
    hero1Id: uuidSchema,
    player2Id: uuidSchema,
    hero2Id: uuidSchema,
    winnerProfileId: uuidSchema,
    winnerRemainingHealth: z.coerce
      .number()
      .int("Les points de vie doivent être un entier.")
      .min(MATCH_RULES.minRemainingHealth, "Points de vie invalides.")
      .max(MATCH_RULES.maxRemainingHealth, "Points de vie invalides."),
    notes: z
      .string()
      .trim()
      .max(MATCH_RULES.maxNotesLength, "Les notes sont trop longues.")
      .optional()
      .transform((pValue) => {
        if (!pValue || pValue.length === 0) {
          return null;
        }
        return pValue;
      }),
  })
  .superRefine((pValue, pCtx) => {
    if (pValue.player1Id === pValue.player2Id) {
      pCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les deux joueurs doivent être différents.",
        path: ["player2Id"],
      });
    }
    if (
      pValue.winnerProfileId !== pValue.player1Id &&
      pValue.winnerProfileId !== pValue.player2Id
    ) {
      pCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le vainqueur doit être l’un des deux joueurs.",
        path: ["winnerProfileId"],
      });
    }
  });

export const createMatchSchema = matchProposalFieldsSchema;
export const updateMatchProposalSchema = matchProposalFieldsSchema;
export const correctMatchSchema = matchProposalFieldsSchema;

export const matchIdSchema = z.object({
  matchId: uuidSchema,
});

export const rejectMatchSchema = z.object({
  matchId: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(1, "Un motif est obligatoire.")
    .max(1000, "Le motif est trop long."),
});

export type MatchProposalFields = z.infer<typeof matchProposalFieldsSchema>;
