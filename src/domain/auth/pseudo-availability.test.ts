import { describe, expect, it } from "vitest";

import {
  canCreateNewProfile,
  evaluatePseudoAvailability,
} from "@/domain/auth/pseudo-availability";

describe("evaluatePseudoAvailability", () => {
  it("allows a free pseudo", () => {
    const result = evaluatePseudoAvailability({
      existingProfile: null,
      existingPendingRequest: null,
    });
    expect(result).toEqual({ kind: "available" });
    expect(canCreateNewProfile(result)).toBe(true);
  });

  it("marks a preloaded pseudo as claimable without creating a second profile", () => {
    const result = evaluatePseudoAvailability({
      existingProfile: {
        id: "profile-1",
        pseudo: "Tim",
        status: "preloaded",
      },
      existingPendingRequest: null,
    });
    expect(result).toEqual({
      kind: "claimablePreloaded",
      profileId: "profile-1",
      pseudo: "Tim",
    });
    expect(canCreateNewProfile(result)).toBe(false);
  });

  it("rejects a pseudo already used by an active profile", () => {
    const result = evaluatePseudoAvailability({
      existingProfile: {
        id: "profile-2",
        pseudo: "Alice",
        status: "active",
      },
      existingPendingRequest: null,
    });
    expect(result.kind).toBe("taken");
  });

  it("rejects a pseudo reserved by a pending account request", () => {
    const result = evaluatePseudoAvailability({
      existingProfile: null,
      existingPendingRequest: {
        id: "req-1",
        status: "pending",
      },
    });
    expect(result.kind).toBe("taken");
  });
});
