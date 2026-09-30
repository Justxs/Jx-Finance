import { afterEach, describe, expect, test, vi } from "vitest";
import {
  daysBetween,
  latestEndedMonth,
  MONTH_KEY_PATTERN,
  monthBounds,
  monthDate,
  monthKeyOfIso,
  monthWeeks,
  parseIso,
  safeTimeZone,
  shiftMonth,
  todayInZone,
  toIso,
} from "./calendar";

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

describe("daysBetween", () => {
  test("counts calendar days across a month end and a daylight-saving change", () => {
    expect(daysBetween("2026-09-30", "2026-10-01")).toBe(1);
    expect(daysBetween("2026-09-30", "2026-09-28")).toBe(-2);
    expect(daysBetween("2026-09-30", "2026-09-30")).toBe(0);
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
  });

  test("answers null for a date it cannot read", () => {
    expect(daysBetween("", "2026-09-30")).toBeNull();
  });
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

describe("month keys", () => {
  test("takes the year and month of an ISO date", () => {
    expect(monthKeyOfIso("2026-01-31")).toBe("2026-01");
  });

  test("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(monthDate("2025-12")).toEqual(new Date(2025, 11, 1));
  });

  test("names the month before today as the latest ended one", () => {
    expect(latestEndedMonth(new Date(2026, 0, 15))).toBe("2025-12");
  });

  test("accepts only a year and a month", () => {
    expect(MONTH_KEY_PATTERN.test("2026-08")).toBe(true);
    expect(MONTH_KEY_PATTERN.test("2026-13")).toBe(false);
    expect(MONTH_KEY_PATTERN.test("2026-8")).toBe(false);
    expect(MONTH_KEY_PATTERN.test("1999-12")).toBe(false);
  });
});

describe("monthWeeks", () => {
  test("starts each week on the configured day with the neighbouring months' days", () => {
    const monday = monthWeeks("2026-09", 1);
    const sunday = monthWeeks("2026-09", 0);

    expect(monday[0]?.[0]).toBe("2026-08-31");
    expect(monday.at(-1)?.at(-1)).toBe("2026-10-04");
    expect(sunday[0]?.[0]).toBe("2026-08-30");
    expect(sunday.at(-1)?.at(-1)).toBe("2026-10-03");
    expect(monday.every((week) => week.length === 7)).toBe(true);
  });

  test("gives a month that spans six weeks all six", () => {
    const weeks = monthWeeks("2026-08", 1);

    expect(weeks).toHaveLength(6);
    expect(weeks[0]?.[5]).toBe("2026-08-01");
    expect(weeks[5]?.[0]).toBe("2026-08-31");
  });

  test("covers February of a leap year and one that fits four weeks", () => {
    expect(monthWeeks("2028-02", 1).flat()).toContain("2028-02-29");
    expect(monthWeeks("2028-02", 1).at(-1)?.at(-1)).toBe("2028-03-05");
    expect(monthWeeks("2026-02", 0)).toHaveLength(4);
    expect(monthWeeks("2026-02", 1)).toHaveLength(5);
  });
});
