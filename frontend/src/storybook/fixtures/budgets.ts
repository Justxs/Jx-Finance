import type { BudgetResponse } from "@/api/generated/model";
import { fromCents, ids, toCents } from "./base";
import { categories } from "./categories";
import { expenseParts, monthTransactions } from "./transactions";

function spentInMonth(categoryId: string): number {
  return expenseParts(monthTransactions)
    .filter((part) => part.categoryId === categoryId)
    .reduce((total, part) => total + part.cents, 0);
}

function budget(id: string, categoryId: string, limitAmount: string): BudgetResponse {
  const spent = spentInMonth(categoryId);
  return {
    id,
    categoryId,
    categoryName: categories.find((item) => item.id === categoryId)?.name ?? "",
    limitAmount,
    spent: fromCents(spent),
    remaining: fromCents(toCents(limitAmount) - spent),
    period: "Monthly",
  };
}

export const overLimitBudget: BudgetResponse = budget(
  ids.budgets.food,
  ids.categories.food,
  "150.00",
);

export const budgets: BudgetResponse[] = [
  overLimitBudget,
  budget(ids.budgets.transport, ids.categories.transport, "120.00"),
  budget(ids.budgets.entertainment, ids.categories.entertainment, "60.00"),
  budget(ids.budgets.utilities, ids.categories.utilities, "150.00"),
];
