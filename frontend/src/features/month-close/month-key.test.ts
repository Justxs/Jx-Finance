import { describe, expect, test } from "vitest";
import {
  latestEndedMonth,
  MONTH_KEY_PATTERN,
  monthKeyOfIso,
  shiftMonth,
  yearOf,
} from "./month-key";

describe("month keys", () => {
  test("takes the year and month of an ISO date", () => {
    expect(monthKeyOfIso("2026-01-31")).toBe("2026-01");
  });

  test("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(yearOf("2025-12")).toBe(2025);
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
