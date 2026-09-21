import { expect, test } from "vitest";
import {
  taxAccountIds,
  taxSummaryParams,
  taxYearOptions,
  valueHistoryParams,
} from "./investment-queries";

const today = new Date(2026, 8, 18);

test("a value range ends today and starts the chosen number of months earlier", () => {
  expect(valueHistoryParams(undefined, "threeMonths", today)).toEqual({
    accountId: undefined,
    from: "2026-06-18",
    to: "2026-09-18",
  });
  expect(valueHistoryParams("account", "oneYear", today).from).toBe("2025-09-18");
  expect(valueHistoryParams("account", "fiveYears", today).from).toBe("2021-09-18");
});

test("all time asks from a date before any trade", () => {
  expect(valueHistoryParams("account", "all", today)).toEqual({
    accountId: "account",
    from: "1970-01-01",
    to: "2026-09-18",
  });
});

test("a tax account selection keeps only known ids, once each", () => {
  expect(taxAccountIds("a, b ,a,c", ["a", "b"])).toEqual(["a", "b"]);
  expect(taxAccountIds(undefined, ["a"])).toEqual([]);
});

test("an empty tax account selection asks for every visible account", () => {
  expect(taxSummaryParams(2026, [])).toEqual({ year: 2026, accountIds: undefined });
  expect(taxSummaryParams(undefined, ["a", "b"])).toEqual({ year: undefined, accountIds: "a,b" });
});

test("the chosen year is offered even when nothing was recorded in it", () => {
  expect(taxYearOptions([2026, 2024], 2025)).toEqual([2026, 2025, 2024]);
  expect(taxYearOptions([2026], 2026)).toEqual([2026]);
});
