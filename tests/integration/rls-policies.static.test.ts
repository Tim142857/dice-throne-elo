import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const rlsSql = readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260719100400_rls_policies.sql"),
  "utf8",
);

function policiesForTable(pTable: string): string[] {
  const pattern = new RegExp(
    `create policy\\s+(\\w+)\\s+on public\\.${pTable}\\s+for\\s+(\\w+)`,
    "gi",
  );
  const found: string[] = [];
  for (const match of rlsSql.matchAll(pattern)) {
    found.push(`${match[1]}:${match[2]?.toLowerCase()}`);
  }
  return found;
}

describe("RLS policies (static migration contract)", () => {
  it("enables RLS on sensitive tables", () => {
    for (const table of [
      "matches",
      "match_proposals",
      "match_actions",
      "player_ratings",
      "player_hero_ratings",
      "rating_events",
      "profiles",
      "heroes",
      "account_requests",
    ]) {
      expect(rlsSql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it("exposes public read of validated matches only", () => {
    expect(rlsSql).toContain("matches_select_validated_public");
    expect(rlsSql).toMatch(/using \(status = 'validated'\)/);
  });

  it("does not grant client write policies on matches or ratings", () => {
    const matchOps = policiesForTable("matches").map((pEntry) => pEntry.split(":")[1]);
    const ratingOps = policiesForTable("player_ratings").map((pEntry) => pEntry.split(":")[1]);
    const eventOps = policiesForTable("rating_events").map((pEntry) => pEntry.split(":")[1]);

    expect(matchOps.every((pOp) => pOp === "select")).toBe(true);
    expect(ratingOps.every((pOp) => pOp === "select")).toBe(true);
    expect(eventOps.every((pOp) => pOp === "select")).toBe(true);
  });

  it("allows admin-only hero writes", () => {
    expect(rlsSql).toContain("heroes_admin_write");
    expect(policiesForTable("heroes")).toEqual(
      expect.arrayContaining(["heroes_select_all:select", "heroes_admin_write:all"]),
    );
  });
});
