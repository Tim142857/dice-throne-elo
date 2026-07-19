import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const protectedPrefixes = [
  "/tableau-de-bord",
  "/compte",
  "/mes-matchs",
  "/matchs/nouveau",
  "/notifications",
  "/inscription/finaliser",
  "/admin",
];

export async function middleware(pRequest: NextRequest) {
  const { response, user } = await updateSession(pRequest);
  const pathname = pRequest.nextUrl.pathname;
  const isProtected = protectedPrefixes.some(
    (pPrefix) => pathname === pPrefix || pathname.startsWith(`${pPrefix}/`),
  );

  if (isProtected && !user) {
    const loginUrl = pRequest.nextUrl.clone();
    loginUrl.pathname = "/connexion";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
