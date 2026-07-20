import { describe, expect, it } from "vitest";

import { buildAuthCallbackUrl, resolveAppBaseUrlFromHeaders } from "@/lib/app-url";

describe("resolveAppBaseUrlFromHeaders", () => {
  it("uses the forwarded host in production", () => {
    const headerList = new Headers({
      "x-forwarded-host": "dice-throne-elo.vercel.app",
      "x-forwarded-proto": "https",
    });

    expect(resolveAppBaseUrlFromHeaders(headerList)).toBe("https://dice-throne-elo.vercel.app");
  });

  it("uses http for localhost", () => {
    const headerList = new Headers({
      host: "localhost:3000",
    });

    expect(resolveAppBaseUrlFromHeaders(headerList)).toBe("http://localhost:3000");
  });

  it("returns null when no host is available", () => {
    expect(resolveAppBaseUrlFromHeaders(new Headers())).toBeNull();
  });
});

describe("buildAuthCallbackUrl", () => {
  it("builds the email confirmation callback without localhost leakage", () => {
    expect(buildAuthCallbackUrl("https://dice-throne-elo.vercel.app")).toBe(
      "https://dice-throne-elo.vercel.app/auth/callback",
    );
  });

  it("preserves the next path for OAuth", () => {
    expect(buildAuthCallbackUrl("https://dice-throne-elo.vercel.app", "/tableau-de-bord")).toBe(
      "https://dice-throne-elo.vercel.app/auth/callback?next=%2Ftableau-de-bord",
    );
  });
});
