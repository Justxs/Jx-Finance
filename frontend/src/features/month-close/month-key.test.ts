import { describe, expect, test } from "vitest";
import type { MonthCloseMonthStatus } from "@/api/generated/model";
import {
  defaultMonth,
  latestEndedMonth,
  MONTH_KEY_PATTERN,
  monthKeyOfIso,
  shiftMonth,
  yearOf,
} from "./month-key";

function status(month: string, value: MonthCloseMonthStatus["status"]): MonthCloseMonthStatus {
  return { month: `${month}-01`, status: value, closedAt: null };
}

describe("month keys", () => {
  test("takes the year and month of an ISO date", () => {
    expect(monthKeyOfIso("2026-01-31")).toBe("2026-01");
  });

  test("shifts across year boundaries", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2025-12", 1)).toBe("2026-01");
    expect(yearOf("2025-12")).toBe(2025);
  });

  test("accepts only a year and a month", () => {
    expect(MONTH_KEY_PATTERN.test("2026-08")).toBe(true);
    expect(MONTH_KEY_PATTERN.test("2026-13")).toBe(false);
    expect(MONTH_KEY_PATTERN.test("2026-8")).toBe(false);
    expect(MONTH_KEY_PATTERN.test("1999-12")).toBe(false);
  });
});

describe("defaultMonth", () => {
  const today = new Date(2026, 8, 26);

  test("picks the latest ended month when it is still open", () => {
    expect(latestEndedMonth(today)).toBe("2026-08");
    expect(defaultMonth(today, [status("2026-07", "open"), status("2026-08", "open")])).toBe(
      "2026-08",
    );
  });

  test("goes back to the latest open month when the last one is closed", () => {
    expect(
      defaultMonth(today, [
        status("2026-06", "open"),
        status("2026-07", "closed"),
        status("2026-08", "closedChanged"),
        status("2026-09", "notEnded"),
      ]),
    ).toBe("2026-06");
  });

  test("falls back to the latest ended month when everything is closed", () => {
    expect(defaultMonth(today, [status("2026-08", "closed")])).toBe("2026-08");
  });
});
