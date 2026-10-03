import type { BudgetPeriod, BudgetResponse } from "@/api/generated/model";
import { toCents } from "@/lib/money";
import { periodOrder } from "./budget-periods";

interface PeriodTotals {
  period: BudgetPeriod;
  spentCents: number;
  limitCents: number;
  leftCents: number;
}

function overCentsOf(budget: BudgetResponse) {
  return toCents(budget.spent) - toCents(budget.effectiveLimit);
}

function totalsOf(period: BudgetPeriod, budgets: readonly BudgetResponse[]): PeriodTotals {
  return {
    period,
    spentCents: budgets.reduce((sum, budget) => sum + toCents(budget.spent), 0),
    limitCents: budgets.reduce((sum, budget) => sum + toCents(budget.effectiveLimit), 0),
    leftCents: budgets.reduce((sum, budget) => sum + Math.max(0, -overCentsOf(budget)), 0),
  };
}

export function budgetOverview(budgets: readonly BudgetResponse[]) {
  const over = budgets.filter((budget) => overCentsOf(budget) > 0);
  const periods = periodOrder.flatMap((period) => {
    const inPeriod = budgets.filter((budget) => budget.period === period);
    return inPeriod.length === 0 ? [] : [totalsOf(period, inPeriod)];
  });

  return {
    over,
    overCents: over.reduce((sum, budget) => sum + overCentsOf(budget), 0),
    periods,
  };
}
