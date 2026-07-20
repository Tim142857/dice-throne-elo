import { describe, expect, it } from "vitest";

import { createMatchSchema } from "@/validation/match";

describe("createMatchSchema", () => {
  const base = {
    playedAt: "2024-06-01",
    player1Id: "11111111-1111-4111-8111-111111111111",
    hero1Id: "22222222-2222-4222-8222-222222222222",
    player2Id: "33333333-3333-4333-8333-333333333333",
    hero2Id: "44444444-4444-4444-8444-444444444444",
    winnerProfileId: "11111111-1111-4111-8111-111111111111",
    player1RemainingHealth: 12,
    player2RemainingHealth: 0,
  };

  it("accepts a valid match payload", () => {
    expect(createMatchSchema.safeParse(base).success).toBe(true);
  });

  it("rejects identical players", () => {
    const result = createMatchSchema.safeParse({
      ...base,
      player2Id: base.player1Id,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a winner outside the match", () => {
    const result = createMatchSchema.safeParse({
      ...base,
      winnerProfileId: "55555555-5555-4555-8555-555555555555",
    });
    expect(result.success).toBe(false);
  });
});
