import { describe, expect, it } from "vitest";

import { buildEloHistoryPoints } from "@/domain/rankings/elo-history";

describe("buildEloHistoryPoints", () => {
  it("places the initial rating before the first event chronologically", () => {
    const history = buildEloHistoryPoints([
      {
        processedAt: "2026-07-18T12:00:00.000Z",
        ratingAfter: 1016,
        ratingDisplay: 1016,
      },
      {
        processedAt: "2026-07-18T18:00:00.000Z",
        ratingAfter: 1032,
        ratingDisplay: 1032,
      },
    ]);

    expect(history).toHaveLength(3);
    expect(history[0]?.ratingDisplay).toBe(1000);
    expect(history[1]?.at).toBe("2026-07-18T12:00:00.000Z");
    expect(history[2]?.at).toBe("2026-07-18T18:00:00.000Z");
    expect(history[0]!.at < history[1]!.at).toBe(true);
  });

  it("sorts events even if they arrive out of order", () => {
    const history = buildEloHistoryPoints([
      {
        processedAt: "2026-07-20T10:00:00.000Z",
        ratingAfter: 1040,
        ratingDisplay: 1040,
      },
      {
        processedAt: "2026-07-18T10:00:00.000Z",
        ratingAfter: 1016,
        ratingDisplay: 1016,
      },
    ]);

    expect(history[1]?.at).toBe("2026-07-18T10:00:00.000Z");
    expect(history[2]?.at).toBe("2026-07-20T10:00:00.000Z");
  });
});
