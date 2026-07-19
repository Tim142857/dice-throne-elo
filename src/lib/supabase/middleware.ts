import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

import { getPublicEnv, hasPublicEnv } from "@/lib/env";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function updateSession(pRequest: NextRequest): Promise<{
  response: NextResponse;
  user: User | null;
}> {
  let response = NextResponse.next({
    request: pRequest,
  });

  if (!hasPublicEnv()) {
    return { response, user: null };
  }

  const env = getPublicEnv();

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return pRequest.cookies.getAll();
      },
      setAll(pCookiesToSet: CookieToSet[]) {
        for (const cookie of pCookiesToSet) {
          pRequest.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({
          request: pRequest,
        });

        for (const cookie of pCookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, user };
}
