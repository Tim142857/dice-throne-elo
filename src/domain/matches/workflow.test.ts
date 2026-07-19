import { describe, expect, it } from "vitest";

import {
  assertTransitionAllowed,
  buildDuplicateFingerprint,
  getOpponentProfileId,
  isProbableDuplicate,
  isTransitionAllowed,
  resolveActorRole,
} from "@/domain/matches/workflow";

describe("match workflow transitions", () => {
  it("allows opponent validation from pendingOpponent", () => {
    expect(
      isTransitionAllowed({
        from: "pendingOpponent",
        to: "validated",
        action: "validatedByOpponent",
        actor: "opponent",
      }),
    ).toBe(true);
  });

  it("forbids the creator from validating their own pending match", () => {
    expect(
      isTransitionAllowed({
        from: "pendingOpponent",
        to: "validated",
        action: "validatedByOpponent",
        actor: "creator",
      }),
    ).toBe(false);
  });

  it("allows correction then dispute", () => {
    expect(
      isTransitionAllowed({
        from: "pendingOpponent",
        to: "pendingCreatorConfirmation",
        action: "correctionProposed",
        actor: "opponent",
      }),
    ).toBe(true);
    expect(
      isTransitionAllowed({
        from: "pendingCreatorConfirmation",
        to: "disputed",
        action: "correctionRejected",
        actor: "creator",
      }),
    ).toBe(true);
  });

  it("allows admin to resolve or cancel a dispute", () => {
    expect(
      isTransitionAllowed({
        from: "disputed",
        to: "validated",
        action: "resolvedByAdmin",
        actor: "admin",
      }),
    ).toBe(true);
    expect(
      isTransitionAllowed({
        from: "disputed",
        to: "cancelledByAdmin",
        action: "cancelledByAdmin",
        actor: "admin",
      }),
    ).toBe(true);
  });

  it("throws on illegal transition", () => {
    expect(() =>
      assertTransitionAllowed({
        from: "validated",
        to: "pendingOpponent",
        action: "updated",
        actor: "creator",
      }),
    ).toThrow(/non autorisée/);
  });
});

describe("resolveActorRole", () => {
  it("detects creator and opponent", () => {
    expect(
      resolveActorRole({
        actorProfileId: "p1",
        createdByProfileId: "p1",
        player1Id: "p1",
        player2Id: "p2",
        isAdmin: false,
      }),
    ).toBe("creator");
    expect(
      resolveActorRole({
        actorProfileId: "p2",
        createdByProfileId: "p1",
        player1Id: "p1",
        player2Id: "p2",
        isAdmin: false,
      }),
    ).toBe("opponent");
  });
});

describe("getOpponentProfileId", () => {
  it("returns the non-creator participant", () => {
    expect(
      getOpponentProfileId({
        createdByProfileId: "p1",
        player1Id: "p1",
        player2Id: "p2",
      }),
    ).toBe("p2");
  });
});

describe("probable duplicates", () => {
  it("detects the same match with swapped player order", () => {
    const left = {
      playedAt: "2024-01-01",
      player1Id: "a",
      player2Id: "b",
      hero1Id: "h1",
      hero2Id: "h2",
      winnerProfileId: "a",
    };
    const right = {
      playedAt: "2024-01-01",
      player1Id: "b",
      player2Id: "a",
      hero1Id: "h2",
      hero2Id: "h1",
      winnerProfileId: "a",
    };
    expect(isProbableDuplicate(left, right)).toBe(true);
    expect(buildDuplicateFingerprint(left)).toBe(buildDuplicateFingerprint(right));
  });

  it("does not flag different winners as duplicates", () => {
    expect(
      isProbableDuplicate(
        {
          playedAt: "2024-01-01",
          player1Id: "a",
          player2Id: "b",
          hero1Id: "h1",
          hero2Id: "h2",
          winnerProfileId: "a",
        },
        {
          playedAt: "2024-01-01",
          player1Id: "a",
          player2Id: "b",
          hero1Id: "h1",
          hero2Id: "h2",
          winnerProfileId: "b",
        },
      ),
    ).toBe(false);
  });
});
