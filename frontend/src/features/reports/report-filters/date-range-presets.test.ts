import { describe, expect, test, vi } from "vitest";
import { detectPreset, presetRange } from "./date-range-presets";

function today() {
  return new Date(2026, 8, 19);
}

describe.each(["Europe/Vilnius", "America/Los_Angeles", "UTC"])(
  "report dates follow the local calendar in %s",
  (zone) => {
    test("presets", () => {
      vi.stubEnv("TZ", zone);
      const zoned = new Date(2026, 8, 6, 0, 15);

      expect(presetRange("thisMonth", zoned)).toEqual({
        dateFrom: "2026-09-01",
        dateTo: "2026-09-06",
      });
      expect(presetRange("lastMonth", zoned)).toEqual({
        dateFrom: "2026-08-01",
        dateTo: "2026-08-31",
      });
      expect(presetRange("lastMonth", new Date(2024, 2, 1))).toEqual({
        dateFrom: "2024-02-01",
        dateTo: "2024-02-29",
      });
      expect(presetRange("lastMonth", new Date(2026, 0, 1))).toEqual({
        dateFrom: "2025-12-01",
        dateTo: "2025-12-31",
      });
      expect(detectPreset("2026-09-01", "2026-09-06", zoned)).toBe("thisMonth");
    });
  },
);

describe("presetRange", () => {
  test("this year runs from January to today", () => {
    expect(presetRange("thisYear", today())).toEqual({
      dateFrom: "2026-01-01",
      dateTo: "2026-09-19",
    });
  });

  test("last year is the whole previous calendar year", () => {
    expect(presetRange("lastYear", today())).toEqual({
      dateFrom: "2025-01-01",
      dateTo: "2025-12-31",
    });
  });

  test("custom falls back to this month", () => {
    expect(presetRange("custom", today())).toEqual(presetRange("thisMonth", today()));
  });
});

describe("detectPreset", () => {
  test.each([
    ["2026-09-01", "2026-09-19", "thisMonth"],
    ["2026-08-01", "2026-08-31", "lastMonth"],
    ["2026-01-01", "2026-09-19", "thisYear"],
    ["2025-01-01", "2025-12-31", "lastYear"],
    ["2026-09-02", "2026-09-19", "custom"],
  ] as const)("%s to %s is %s", (dateFrom, dateTo, expected) => {
    expect(detectPreset(dateFrom, dateTo, today())).toBe(expected);
  });

  test("a missing bound means this month", () => {
    expect(detectPreset(undefined, "2026-09-19", today())).toBe("thisMonth");
    expect(detectPreset("2026-09-01", undefined, today())).toBe("thisMonth");
    expect(detectPreset("", "", today())).toBe("thisMonth");
  });

  test("on the first of January this month wins over this year", () => {
    expect(detectPreset("2026-01-01", "2026-01-01", new Date(2026, 0, 1))).toBe("thisMonth");
  });
});
