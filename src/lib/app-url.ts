import { headers } from "next/headers";

import { getPublicEnv } from "@/lib/env";

function normalizeBaseUrl(pUrl: string): string {
  return pUrl.replace(/\/$/, "");
}

function isLocalhostUrl(pUrl: string): boolean {
  return /localhost|127\.0\.0\.1/.test(pUrl);
}

export function resolveAppBaseUrlFromHeaders(pHeaderList: Headers): string | null {
  const host = pHeaderList.get("x-forwarded-host") ?? pHeaderList.get("host");
  if (!host) {
    return null;
  }

  const protocol =
    pHeaderList.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");

  return normalizeBaseUrl(`${protocol}://${host}`);
}

function resolveAppBaseUrlFromPlatform(): string | null {
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return normalizeBaseUrl(`https://${vercelUrl}`);
  }

  return null;
}

function readConfiguredAppUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) {
    return null;
  }
  return normalizeBaseUrl(raw);
}

/**
 * Resolve order for auth email / OAuth redirects:
 * 1. NEXT_PUBLIC_APP_URL when it is a public (non-localhost) URL
 * 2. Request host when it is public
 * 3. VERCEL_URL
 * 4. Localhost headers / env (development only)
 */
export function resolveAppBaseUrl(pInput: {
  headerList?: Headers | null;
  configuredUrl?: string | null;
  platformUrl?: string | null;
  nodeEnv?: string;
}): string {
  const nodeEnv = pInput.nodeEnv ?? process.env.NODE_ENV ?? "development";
  const configured = pInput.configuredUrl ? normalizeBaseUrl(pInput.configuredUrl) : null;
  const fromHeaders = pInput.headerList
    ? resolveAppBaseUrlFromHeaders(pInput.headerList)
    : null;
  const fromPlatform = pInput.platformUrl ? normalizeBaseUrl(pInput.platformUrl) : null;

  if (configured && !isLocalhostUrl(configured)) {
    return configured;
  }

  if (fromHeaders && !isLocalhostUrl(fromHeaders)) {
    return fromHeaders;
  }

  if (fromPlatform && !isLocalhostUrl(fromPlatform)) {
    return fromPlatform;
  }

  if (nodeEnv === "production") {
    throw new Error(
      "Impossible de déterminer une URL publique pour l’auth. Définissez NEXT_PUBLIC_APP_URL (ex. https://dice-throne-elo.vercel.app) et ajoutez /auth/callback dans Supabase → Redirect URLs.",
    );
  }

  if (fromHeaders) {
    return fromHeaders;
  }

  if (configured) {
    return configured;
  }

  throw new Error("Impossible de déterminer l’URL de l’application.");
}

/**
 * Canonical app origin for auth redirects (email confirmation, OAuth).
 */
export async function getAppBaseUrl(): Promise<string> {
  return resolveAppBaseUrl({
    headerList: await headers(),
    configuredUrl: readConfiguredAppUrl() ?? normalizeBaseUrl(getPublicEnv().NEXT_PUBLIC_APP_URL),
    platformUrl: resolveAppBaseUrlFromPlatform(),
  });
}

export function buildAuthCallbackUrl(pBaseUrl: string, pNextPath?: string): string {
  const callbackUrl = new URL("/auth/callback", pBaseUrl);
  if (pNextPath) {
    callbackUrl.searchParams.set("next", pNextPath);
  }
  return callbackUrl.toString();
}
