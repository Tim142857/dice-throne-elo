import { describe, expect, it } from "vitest";

import { createMatchSchema } from "@/validation/match";

describe("createMatchSchema", () => {
  const base = {
    playedAt: "2024-06-01",
    player1Id: "11111111-1111-4111-8111-111111111111",
    hero1Id: "22222222-2222-4222-8222-222222222222",
    player2Id: "33333333-3333-4333-8333-333333333333",
    hero2Id: "44444444-4444-4444-8444-444444444444",
    player1RemainingHealth: 12,
    player2RemainingHealth: 0,
  };

  it("accepts a valid match payload and derives the winner from health", () => {
    const result = createMatchSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.winnerProfileId).toBe(base.player1Id);
    }
  });

  it("rejects identical players", () => {
    const result = createMatchSchema.safeParse({
      ...base,
      player2Id: base.player1Id,
    });
    expect(result.success).toBe(false);
  });

  it("derives a draw when remaining health is equal", () => {
    const result = createMatchSchema.safeParse({
      ...base,
      player1RemainingHealth: 8,
      player2RemainingHealth: 8,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.winnerProfileId).toBeNull();
    }
  });

  it("accepts a 0-0 draw", () => {
    const result = createMatchSchema.safeParse({
      ...base,
      player1RemainingHealth: 0,
      player2RemainingHealth: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.winnerProfileId).toBeNull();
    }
  });

  it("derives player2 win when they have more health", () => {
    const result = createMatchSchema.safeParse({
      ...base,
      player1RemainingHealth: 4,
      player2RemainingHealth: 9,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.winnerProfileId).toBe(base.player2Id);
    }
  });
});
