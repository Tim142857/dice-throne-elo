import { z } from "zod";

import { MATCH_RULES } from "@/domain/constants";
import { pseudoSchema } from "@/validation/pseudo";

export const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.");

export const presentationMessageSchema = z
  .string()
  .trim()
  .max(MATCH_RULES.maxNotesLength, "Le message de présentation est trop long.")
  .optional()
  .transform((pValue) => {
    if (!pValue || pValue.length === 0) {
      return null;
    }
    return pValue;
  });

export const signUpSchema = z
  .object({
    email: z.string().trim().email("Adresse email invalide."),
    password: passwordSchema,
    passwordConfirm: z.string().min(1, "Confirmez le mot de passe."),
    pseudo: pseudoSchema,
    presentationMessage: presentationMessageSchema,
  })
  .refine((pData) => pData.password === pData.passwordConfirm, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["passwordConfirm"],
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Adresse email invalide."),
  password: passwordSchema,
});

export const completeRegistrationSchema = z.object({
  pseudo: pseudoSchema,
  presentationMessage: presentationMessageSchema,
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type CompleteRegistrationInput = z.infer<typeof completeRegistrationSchema>;
