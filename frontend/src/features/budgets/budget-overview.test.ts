import { describe, expect, test } from "vitest";
import type { BudgetPeriod, BudgetResponse } from "@/api/generated/model";
import { budgetOverview } from "./budget-overview";

function budget(name: string, period: BudgetPeriod, limit: string, spent: string): BudgetResponse {
  return {
    id: name,
    categoryId: name,
    tagId: null,
    name,
    limitAmount: limit,
    carriedAmount: "0.00",
    effectiveLimit: limit,
    spent,
    remaining: (Number(limit) - Number(spent)).toFixed(2),
    period,
    rolloverEnabled: false,
    windowStart: "2026-09-01",
    windowEnd: "2026-09-30",
    scope: "personal",
    householdId: null,
  };
}

describe("budgetOverview", () => {
  test("adds up only the overspend of the budgets that are over", () => {
    const overview = budgetOverview([
      budget("Food", "monthly", "150.00", "204.11"),
      budget("Fun", "monthly", "60.00", "30.00"),
      budget("Holiday", "yearly", "2000.00", "18.00"),
    ]);

    expect(overview.over.map((item) => item.name)).toEqual(["Food"]);
    expect(overview.overCents).toBe(5411);
  });

  test("keeps each period apart and never nets an overspend against what is left", () => {
    const overview = budgetOverview([
      budget("Holiday", "yearly", "2000.00", "18.00"),
      budget("Food", "monthly", "150.00", "204.11"),
      budget("Fun", "monthly", "60.00", "30.00"),
      budget("Bus", "weekly", "40.00", "12.00"),
    ]);

    expect(overview.periods).toEqual([
      { period: "weekly", spentCents: 1200, limitCents: 4000, leftCents: 2800 },
      { period: "monthly", spentCents: 23411, limitCents: 21000, leftCents: 3000 },
      { period: "yearly", spentCents: 1800, limitCents: 200000, leftCents: 198200 },
    ]);
  });

  test("has nothing over and no periods without budgets", () => {
    expect(budgetOverview([])).toEqual({ over: [], overCents: 0, periods: [] });
  });
});
