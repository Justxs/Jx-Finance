import {
  getCreateBudgetMockHandler,
  getDeleteBudgetMockHandler,
  getBudgetsMockHandler,
  getBudgetSuggestionsMockHandler,
  getUpdateBudgetMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { BudgetPeriod } from "@/api/generated/model";
import type { BudgetResponse } from "@/api/generated/model";
import { toCents } from "@/lib/money";
import {
  budgetSuggestions,
  budgets,
  budgetWindows,
  tags,
  weeklyBudgetSuggestions,
} from "@/storybook/fixtures";
import { categoryName } from "./categories";
import { query, readBody, text } from "./http";
import type { Body } from "./http";
import { NEW_ID } from "./ids";
import { updateFrom } from "./lists";

function periodOf(value: string | null, fallback: BudgetPeriod): BudgetPeriod {
  return Object.values(BudgetPeriod).find((period) => period === value) ?? fallback;
}

function mergeBudget(base: BudgetResponse, body: Body): BudgetResponse {
  const tagId = text(body.tagId);
  const categoryId = tagId ? null : (text(body.categoryId) ?? base.categoryId);
  const limitAmount = text(body.limitAmount) ?? base.limitAmount;
  const period = periodOf(text(body.period), base.period);
  const rolloverEnabled = body.rolloverEnabled === true;
  const spent = categoryId === base.categoryId && tagId === base.tagId ? base.spent : "0.00";
  const carried = rolloverEnabled ? base.carriedAmount : "0.00";
  const effective = toCents(limitAmount) + toCents(carried);
  const window = budgetWindows[period];
  return {
    ...base,
    categoryId,
    tagId,
    name: tagId
      ? (tags.find((tag) => tag.id === tagId)?.name ?? "")
      : categoryName(categoryId ?? "") || base.name,
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
  getBudgetSuggestionsMockHandler(({ request }) => {
    const period = periodOf(query(request).get("period"), "monthly");
    if (period === "monthly") {
      return budgetSuggestions;
    }
    return period === "weekly" ? weeklyBudgetSuggestions : { period, categories: [] };
  }),
  getCreateBudgetMockHandler(async ({ request }) => {
    const base: BudgetResponse = {
      id: NEW_ID,
      categoryId: "",
      tagId: null,
      name: "",
      limitAmount: "0.00",
      carriedAmount: "0.00",
      effectiveLimit: "0.00",
      spent: "0.00",
      remaining: "0.00",
      period: "monthly",
      rolloverEnabled: false,
      windowStart: budgetWindows.monthly.start,
      windowEnd: budgetWindows.monthly.end,
      scope: "personal",
      householdId: null,
    };
    return mergeBudget(base, await readBody(request));
  }),
  getUpdateBudgetMockHandler(updateFrom(budgets, mergeBudget)),
  getDeleteBudgetMockHandler(),
];
