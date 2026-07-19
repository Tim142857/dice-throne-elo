import { createClient } from "@supabase/supabase-js";

import { getServerEnv } from "@/lib/env";

/**
 * Admin client using the service role key.
 * Server-only: never import this module from client components.
 */
export function createSupabaseAdminClient() {
  const env = getServerEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
