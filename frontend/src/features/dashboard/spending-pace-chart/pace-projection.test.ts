import { describe, expect, test } from "vitest";
import type { RecurringBillResponse } from "@/api/generated/model";
import { billsDueAfter, projectedTotals } from "./pace-projection";

function bill(overrides: Partial<RecurringBillResponse>): RecurringBillResponse {
  return {
    id: "bill",
    name: "Bill",
    shape: "expense",
    kind: "fixed",
    amount: "50.00",
    categoryId: null,
    accountId: null,
    toAccountId: null,
    cadence: "monthly",
    nextDueDate: "2026-09-20",
    remindDaysBefore: 3,
    isActive: true,
    matchKey: null,
    latestMatch: null,
    debtId: null,
    ...overrides,
  };
}

describe("billsDueAfter", () => {
  const today = new Date(2026, 8, 10);

  test("keeps active expense bills due later this month, repeating weekly ones", () => {
    const due = billsDueAfter(
      [
        bill({ nextDueDate: "2026-09-20" }),
        bill({ nextDueDate: "2026-09-12", cadence: "weekly", amount: "10.00" }),
        bill({ nextDueDate: "2026-09-05" }),
        bill({ nextDueDate: "2026-10-01" }),
        bill({ shape: "income" }),
        bill({ isActive: false }),
        bill({ amount: null }),
      ],
      today,
      30,
    );

    expect(due).toEqual([
      { day: 20, amount: 50 },
      { day: 12, amount: 10 },
      { day: 19, amount: 10 },
      { day: 26, amount: 10 },
    ]);
  });
});

describe("projectedTotals", () => {
  const average = [10, 20, 30, 40, 50];

  test("follows the average's remaining spending from today's total", () => {
    expect(projectedTotals(100, 3, average, [], 5)).toEqual([undefined, undefined, 100, 110, 120]);
  });

  test("places bills on their day and takes them out of the everyday estimate", () => {
    expect(projectedTotals(100, 3, average, [{ day: 5, amount: 15 }], 5)).toEqual([
      undefined,
      undefined,
      100,
      102.5,
      120,
    ]);
  });

  test("spreads bills beyond the average instead of shrinking below them", () => {
    expect(projectedTotals(100, 3, average, [{ day: 4, amount: 60 }], 5)).toEqual([
      undefined,
      undefined,
      100,
      160,
      160,
    ]);
  });

  test("draws nothing on the last day or with nothing to expect", () => {
    expect(projectedTotals(100, 5, average, [], 5)).toEqual([]);
    expect(projectedTotals(100, 3, [], [], 5)).toEqual([]);
  });
});
