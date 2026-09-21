import {
  getCreateBudgetMockHandler,
  getDeleteBudgetMockHandler,
  getBudgetsMockHandler,
  getUpdateBudgetMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { BudgetPeriod } from "@/api/generated/model";
import type { BudgetResponse } from "@/api/generated/model";
import { toCents } from "@/lib/money";
import { budgets, budgetWindows } from "@/storybook/fixtures";
import { categoryName } from "./categories";
import { found, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { byId } from "./lists";

function periodOf(value: string | null, fallback: BudgetPeriod): BudgetPeriod {
  return Object.values(BudgetPeriod).find((period) => period === value) ?? fallback;
}

function mergeBudget(base: BudgetResponse, body: Body): BudgetResponse {
  const categoryId = text(body.categoryId) ?? base.categoryId;
  const limitAmount = text(body.limitAmount) ?? base.limitAmount;
  const period = periodOf(text(body.period), base.period);
  const rolloverEnabled = body.rolloverEnabled === true;
  const spent = categoryId === base.categoryId ? base.spent : "0.00";
  const carried = rolloverEnabled ? base.carriedAmount : "0.00";
  const effective = toCents(limitAmount) + toCents(carried);
  const window = budgetWindows[period];
  return {
    ...base,
    categoryId,
    categoryName: categoryName(categoryId) || base.categoryName,
    limitAmount,
    carriedAmount: carried,
    effectiveLimit: (effective / 100).toFixed(2),
    spent,
    remaining: ((effective - toCents(spent)) / 100).toFixed(2),
    period,
    rolloverEnabled,
    windowStart: window.start,
    windowEnd: window.end,
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
      carriedAmount: "0.00",
      effectiveLimit: "0.00",
      spent: "0.00",
      remaining: "0.00",
      period: "monthly",
      rolloverEnabled: false,
      windowStart: budgetWindows.monthly.start,
      windowEnd: budgetWindows.monthly.end,
    };
    return mergeBudget(base, await readBody(request));
  }),
  getUpdateBudgetMockHandler(async ({ params, request }) =>
    mergeBudget(found(byId(budgets, params.id)), await readBody(request)),
  ),
  getDeleteBudgetMockHandler(),
];
