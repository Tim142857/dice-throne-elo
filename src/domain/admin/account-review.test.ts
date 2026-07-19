import { describe, expect, it } from "vitest";

import {
  nextStatusAfterReject,
  planAccountApproval,
} from "@/domain/admin/account-review";

describe("planAccountApproval", () => {
  it("activates a newly created pending profile", () => {
    expect(
      planAccountApproval({
        requestLinkedProfileId: null,
        pendingProfileId: "pending-1",
        selectedPreloadedProfileId: null,
      }),
    ).toEqual({
      mode: "activateNewProfile",
      targetProfileId: "pending-1",
      shouldDeleteOrphanPendingProfile: false,
      orphanPendingProfileId: null,
    });
  });

  it("links to a preloaded profile and drops the orphan pending profile", () => {
    expect(
      planAccountApproval({
        requestLinkedProfileId: "pre-1",
        pendingProfileId: "pending-1",
        selectedPreloadedProfileId: null,
      }),
    ).toEqual({
      mode: "linkPreloadedProfile",
      targetProfileId: "pre-1",
      shouldDeleteOrphanPendingProfile: true,
      orphanPendingProfileId: "pending-1",
    });
  });

  it("prefers an explicit admin selection", () => {
    expect(
      planAccountApproval({
        requestLinkedProfileId: "pre-1",
        pendingProfileId: null,
        selectedPreloadedProfileId: "pre-2",
      }).targetProfileId,
    ).toBe("pre-2");
  });
});

describe("nextStatusAfterReject", () => {
  it("marks pendingApproval profiles as rejected", () => {
    expect(nextStatusAfterReject("pendingApproval")).toBe("rejected");
  });
});
