import { NextResponse } from "next/server";

import { provisionAccountForUser } from "@/lib/auth/provision-account";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(pRequest: Request) {
  const url = new URL(pRequest.url);
  const code = url.searchParams.get("code");
  const nextPath = url.searchParams.get("next") || "/tableau-de-bord";

  if (!code) {
    return NextResponse.redirect(new URL("/connexion?error=missing_code", url.origin));
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/connexion?error=oauth", url.origin));
  }

  if (data.user) {
    const provision = await provisionAccountForUser(data.user);
    if (provision.status === "needsPseudo") {
      return NextResponse.redirect(new URL("/inscription/finaliser", url.origin));
    }
    if (provision.status === "error") {
      return NextResponse.redirect(
        new URL(`/connexion?error=${encodeURIComponent(provision.message)}`, url.origin),
      );
    }
  }

  const safeNext = nextPath.startsWith("/") ? nextPath : "/tableau-de-bord";
  return NextResponse.redirect(new URL(safeNext, url.origin));
}
