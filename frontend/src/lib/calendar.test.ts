import { afterEach, describe, expect, test, vi } from "vitest";
import { monthBounds, parseIso, safeTimeZone, todayInZone, toIso } from "./calendar";

afterEach(() => {
  vi.useRealTimers();
});

describe("toIso", () => {
  test("pads month and day from the local calendar", () => {
    expect(toIso(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toIso(new Date(2026, 11, 31, 23, 59))).toBe("2026-12-31");
  });
});

describe("parseIso", () => {
  test("reads a date at local midnight", () => {
    const parsed = parseIso("2026-09-06");
    expect(parsed).toEqual(new Date(2026, 8, 6));
    expect(parsed?.getHours()).toBe(0);
  });

  test("round-trips through toIso", () => {
    const parsed = parseIso("2024-02-29");
    expect(parsed && toIso(parsed)).toBe("2024-02-29");
  });

  test.each(["", "2026-9-6", "06/09/2026", "2026-09-06T00:00:00Z", "abcd-ef-gh"])(
    "rejects %j",
    (value) => {
      expect(parseIso(value)).toBeNull();
    },
  );
});

describe("safeTimeZone", () => {
  test("keeps zones the runtime knows", () => {
    expect(safeTimeZone("Europe/Vilnius")).toBe("Europe/Vilnius");
    expect(safeTimeZone("UTC")).toBe("UTC");
  });

  test.each([null, undefined, "", "Not/AZone"])("drops %j", (value) => {
    expect(safeTimeZone(value)).toBeUndefined();
  });
});

describe("todayInZone", () => {
  test("follows the calendar of the requested zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T22:30:00Z"));

    expect(todayInZone("UTC")).toBe("2026-09-06");
    expect(todayInZone("Europe/Vilnius")).toBe("2026-09-07");
    expect(todayInZone("America/Los_Angeles")).toBe("2026-09-06");
  });

  test("falls back to the local date for an unknown zone", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 6, 12));

    expect(todayInZone("Not/AZone")).toBe("2026-09-06");
    expect(todayInZone(null)).toBe("2026-09-06");
    expect(todayInZone(undefined)).toBe("2026-09-06");
  });
});

describe("monthBounds", () => {
  test("spans the first to the last day of the month", () => {
    expect(monthBounds(new Date(2026, 8, 19))).toEqual({
      dateFrom: "2026-09-01",
      dateTo: "2026-09-30",
    });
  });

  test("handles leap February and December", () => {
    expect(monthBounds(new Date(2024, 1, 10)).dateTo).toBe("2024-02-29");
    expect(monthBounds(new Date(2025, 1, 10)).dateTo).toBe("2025-02-28");
    expect(monthBounds(new Date(2026, 11, 25))).toEqual({
      dateFrom: "2026-12-01",
      dateTo: "2026-12-31",
    });
  });
});
