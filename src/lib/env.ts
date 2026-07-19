import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: nonEmptyString,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: nonEmptyString,
  NEXT_PUBLIC_APP_URL: nonEmptyString,
});

export const serverEnvSchema = publicEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: nonEmptyString,
  ADMIN_EMAIL: z.string().trim().email(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
export type ServerEnv = z.infer<typeof serverEnvSchema>;

function readPublicEnvInput() {
  return {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  };
}

export function hasPublicEnv(): boolean {
  return publicEnvSchema.safeParse(readPublicEnvInput()).success;
}

export function hasServerEnv(): boolean {
  return serverEnvSchema.safeParse({
    ...readPublicEnvInput(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  }).success;
}

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse(readPublicEnvInput());
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    ...readPublicEnvInput(),
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  });
}
