import { describe, expect, it } from "vitest";

import {
  buildPlayerJoinedEvent,
  isTopClash,
  isUpsetDeficit,
} from "@/domain/activity/copy";

describe("activity copy helpers", () => {
  it("detects upsets from Elo deficit", () => {
    expect(isUpsetDeficit(1000, 1150)).toBe(150);
    expect(isUpsetDeficit(1000, 1050)).toBeNull();
  });

  it("detects top clashes", () => {
    expect(isTopClash(2, 4)).toBe(true);
    expect(isTopClash(2, 8)).toBe(false);
  });

  it("builds a player joined event", () => {
    const event = buildPlayerJoinedEvent({
      profileId: "p1",
      pseudo: "Tim",
      slug: "tim",
      occurredAt: "2026-07-22T10:00:00.000Z",
    });
    expect(event.type).toBe("player_joined");
    expect(event.href).toBe("/joueurs/tim");
  });
});
