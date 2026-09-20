import {
  getCreateBudgetMockHandler,
  getDeleteBudgetMockHandler,
  getBudgetsMockHandler,
  getUpdateBudgetMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import type { BudgetResponse } from "@/api/generated/model";
import { toCents } from "@/lib/money";
import { budgets } from "@/storybook/fixtures";
import { categoryName } from "./categories";
import { found, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

function mergeBudget(base: BudgetResponse, body: Body): BudgetResponse {
  const categoryId = text(body.categoryId) ?? base.categoryId;
  const limitAmount = text(body.limitAmount) ?? base.limitAmount;
  const spent = categoryId === base.categoryId ? base.spent : "0.00";
  return {
    ...base,
    categoryId,
    categoryName: categoryName(categoryId) || base.categoryName,
    limitAmount,
    spent,
    remaining: ((toCents(limitAmount) - toCents(spent)) / 100).toFixed(2),
  };
}

export const budgetHandlers = [
  getBudgetsMockHandler(budgets),
  getCreateBudgetMockHandler(async ({ request }) => {
    const base: BudgetResponse = {
      id: NEW_ID,
      categoryId: "",
      categoryName: "",
      limitAmount: "0.00",
      spent: "0.00",
      remaining: "0.00",
      period: "Monthly",
    };
    return mergeBudget(base, await readBody(request));
  }),
  getUpdateBudgetMockHandler(async ({ params, request }) =>
    mergeBudget(found(byId(budgets, params.id)), await readBody(request)),
  ),
  getDeleteBudgetMockHandler(),
];
