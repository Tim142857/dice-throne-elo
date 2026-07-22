import { z } from "zod";

import { MATCH_RULES } from "@/domain/constants";
import { resolveWinnerProfileIdFromHealth } from "@/domain/matches/final-health";

const uuidSchema = z.string().uuid("Identifiant invalide.");

const remainingHealthSchema = z.coerce
  .number()
  .int("Les points de vie doivent être un entier.")
  .min(MATCH_RULES.minRemainingHealth, "Points de vie invalides.")
  .max(MATCH_RULES.maxRemainingHealth, "Points de vie invalides.");

const matchProposalFieldsBaseSchema = z.object({
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
  player1RemainingHealth: remainingHealthSchema,
  player2RemainingHealth: remainingHealthSchema,
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
});

export const matchProposalFieldsSchema = matchProposalFieldsBaseSchema
  .superRefine((pValue, pCtx) => {
    if (pValue.player1Id === pValue.player2Id) {
      pCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Les deux joueurs doivent être différents.",
        path: ["player2Id"],
      });
    }
  })
  .transform((pValue) => ({
    ...pValue,
    winnerProfileId: resolveWinnerProfileIdFromHealth({
      player1Id: pValue.player1Id,
      player2Id: pValue.player2Id,
      player1RemainingHealth: pValue.player1RemainingHealth,
      player2RemainingHealth: pValue.player2RemainingHealth,
    }),
  }));

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
