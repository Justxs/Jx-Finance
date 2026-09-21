import type { BudgetPeriod, BudgetResponse } from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { ids } from "./base";
import { categories } from "./categories";
import { expenseParts, transactionsBetween } from "./transactions";

interface Window {
  start: string;
  end: string;
}

export const budgetWindows: Record<BudgetPeriod, Window> = {
  weekly: { start: "2026-09-14", end: "2026-09-20" },
  monthly: { start: "2026-09-01", end: "2026-09-30" },
  quarterly: { start: "2026-07-01", end: "2026-09-30" },
  yearly: { start: "2026-01-01", end: "2026-12-31" },
};

function spentInWindow(categoryId: string, window: Window): number {
  return expenseParts(transactionsBetween(window.start, window.end))
    .filter((part) => part.categoryId === categoryId)
    .reduce((total, part) => total + part.cents, 0);
}

interface Options {
  period?: BudgetPeriod;
  carried?: string;
}

function budget(
  id: string,
  categoryId: string,
  limitAmount: string,
  { period = "monthly", carried = "0.00" }: Options = {},
): BudgetResponse {
  const window = budgetWindows[period];
  const spent = spentInWindow(categoryId, window);
  const effective = toCents(limitAmount) + toCents(carried);
  return {
    id,
    categoryId,
    categoryName: categories.find((item) => item.id === categoryId)?.name ?? "",
    limitAmount,
    carriedAmount: carried,
    effectiveLimit: fromCents(effective),
    spent: fromCents(spent),
    remaining: fromCents(effective - spent),
    period,
    rolloverEnabled: carried !== "0.00",
    windowStart: window.start,
    windowEnd: window.end,
  };
}

export const overLimitBudget: BudgetResponse = budget(
  ids.budgets.food,
  ids.categories.food,
  "150.00",
);

export const weeklyRolloverBudget: BudgetResponse = budget(
  ids.budgets.transport,
  ids.categories.transport,
  "40.00",
  { period: "weekly", carried: "12.50" },
);

export const budgets: BudgetResponse[] = [
  overLimitBudget,
  weeklyRolloverBudget,
  budget(ids.budgets.entertainment, ids.categories.entertainment, "60.00"),
  budget(ids.budgets.utilities, ids.categories.utilities, "150.00", { period: "quarterly" }),
];
