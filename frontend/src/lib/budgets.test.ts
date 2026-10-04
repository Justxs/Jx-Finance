import { describe, expect, test } from "vitest";
import type { BudgetPeriod, BudgetResponse } from "@/api/generated/model";
import { budget } from "@/storybook/fixtures/budgets";
import { budgetOverview } from "./budgets";

function limited(name: string, period: BudgetPeriod, limit: string, spent: string): BudgetResponse {
  return budget({
    id: name,
    categoryId: name,
    name,
    limitAmount: limit,
    effectiveLimit: limit,
    spent,
    remaining: (Number(limit) - Number(spent)).toFixed(2),
    period,
  });
}

describe("budgetOverview", () => {
  test("adds up only the overspend of the budgets that are over", () => {
    const overview = budgetOverview([
      limited("Food", "monthly", "150.00", "204.11"),
      limited("Fun", "monthly", "60.00", "30.00"),
      limited("Holiday", "yearly", "2000.00", "18.00"),
    ]);

    expect(overview.over.map((item) => item.name)).toEqual(["Food"]);
    expect(overview.overCents).toBe(5411);
  });

  test("keeps each period apart and never nets an overspend against what is left", () => {
    const overview = budgetOverview([
      limited("Holiday", "yearly", "2000.00", "18.00"),
      limited("Food", "monthly", "150.00", "204.11"),
      limited("Fun", "monthly", "60.00", "30.00"),
      limited("Bus", "weekly", "40.00", "12.00"),
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
