import { describe, expect, it } from "vitest";

import { formatDate, formatDateTime } from "@/lib/dates";

describe("formatDate", () => {
  it("formats ISO date strings as dd-mm-YYYY", () => {
    expect(formatDate("2026-07-18")).toBe("18-07-2026");
  });

  it("formats Date objects as dd-mm-YYYY", () => {
    expect(formatDate(new Date(2026, 6, 18))).toBe("18-07-2026");
  });

  it("formats ISO timestamps using the local calendar date", () => {
    expect(formatDate("2026-07-18T22:15:00.000Z")).toMatch(/^\d{2}-\d{2}-\d{4}$/);
  });
});

describe("formatDateTime", () => {
  it("formats timestamps as dd-mm-YYYY HH:mm", () => {
    const formatted = formatDateTime(new Date(2026, 6, 18, 14, 30));
    expect(formatted).toBe("18-07-2026 14:30");
  });
});
