import { expect, test } from "vitest";
import type { MonthCloseMonthStatus, MonthCloseStatus } from "@/api/generated/model";
import { defaultMonth, uncategorizedParams } from "./month-queries";

function year(statuses: readonly MonthCloseStatus[]): MonthCloseMonthStatus[] {
  return statuses.map((status, index) => ({
    month: `2026-${String(index + 1).padStart(2, "0")}-01`,
    status,
    closedAt: null,
  }));
}

test("the latest ended month opens when nothing waits", () => {
  const months = year(["closed", "closed", "closed", "notEnded"]);

  expect(defaultMonth(months, "2026-03")).toBe("2026-03");
});

test("the latest ended month that is open or changed opens first", () => {
  const months = year(["open", "closedChanged", "closed", "notEnded"]);

  expect(defaultMonth(months, "2026-03")).toBe("2026-02");
});

test("a month that has not ended is never the default", () => {
  const months = year(["closed", "closed", "open", "open"]);

  expect(defaultMonth(months, "2026-02")).toBe("2026-02");
});

test("the uncategorized lines ask for the month's first rows, oldest first", () => {
  expect(uncategorizedParams("2026-08")).toEqual({
    page: 1,
    pageSize: 20,
    sort: "date",
    direction: "asc",
    dateFrom: "2026-08-01",
    dateTo: "2026-08-31",
    uncategorized: true,
  });
});
