import { headers } from "next/headers";

import { getPublicEnv } from "@/lib/env";

function normalizeBaseUrl(pUrl: string): string {
  return pUrl.replace(/\/$/, "");
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

function assertProductionAppUrl(pUrl: string): void {
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(pUrl)) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL pointe vers localhost en production. Configurez l’URL publique du site.",
    );
  }
}

/**
 * Canonical app origin for auth redirects (email confirmation, OAuth).
 * Prefers the incoming request host so production emails never fall back to localhost.
 */
export async function getAppBaseUrl(): Promise<string> {
  const fromHeaders = resolveAppBaseUrlFromHeaders(await headers());
  if (fromHeaders) {
    return fromHeaders;
  }

  const fromPlatform = resolveAppBaseUrlFromPlatform();
  if (fromPlatform) {
    return fromPlatform;
  }

  const envUrl = normalizeBaseUrl(getPublicEnv().NEXT_PUBLIC_APP_URL);
  assertProductionAppUrl(envUrl);
  return envUrl;
}

export function buildAuthCallbackUrl(pBaseUrl: string, pNextPath?: string): string {
  const callbackUrl = new URL("/auth/callback", pBaseUrl);
  if (pNextPath) {
    callbackUrl.searchParams.set("next", pNextPath);
  }
  return callbackUrl.toString();
}
