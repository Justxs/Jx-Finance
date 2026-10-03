import type {
  BudgetPeriod,
  BudgetResponse,
  BudgetSuggestionResponse,
  BudgetSuggestionsResponse,
} from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { ids } from "./base";
import { categories } from "./categories";
import { countedBetween, expenseParts } from "./transactions";

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
  return expenseParts(countedBetween(window.start, window.end))
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
    tagId: null,
    name: categories.find((item) => item.id === categoryId)?.name ?? "",
    limitAmount,
    carriedAmount: carried,
    effectiveLimit: fromCents(effective),
    spent: fromCents(spent),
    remaining: fromCents(effective - spent),
    period,
    rolloverEnabled: carried !== "0.00",
    windowStart: window.start,
    windowEnd: window.end,
    scope: "personal",
    householdId: null,
    version: 1,
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

export const holidayTagBudget: BudgetResponse = {
  id: ids.budgets.holiday,
  categoryId: null,
  tagId: ids.tags.holiday,
  name: "Atostogos 2026",
  limitAmount: "2000.00",
  carriedAmount: "0.00",
  effectiveLimit: "2000.00",
  spent: "18.00",
  remaining: "1982.00",
  period: "yearly",
  rolloverEnabled: false,
  windowStart: budgetWindows.yearly.start,
  windowEnd: budgetWindows.yearly.end,
  scope: "personal",
  householdId: null,
  version: 1,
};

export const budgets: BudgetResponse[] = [
  overLimitBudget,
  weeklyRolloverBudget,
  budget(ids.budgets.entertainment, ids.categories.entertainment, "60.00"),
  budget(ids.budgets.utilities, ids.categories.utilities, "150.00", { period: "quarterly" }),
  holidayTagBudget,
];

const monthWindows: Window[] = [
  { start: "2026-03-01", end: "2026-03-31" },
  { start: "2026-04-01", end: "2026-04-30" },
  { start: "2026-05-01", end: "2026-05-31" },
  { start: "2026-06-01", end: "2026-06-30" },
  { start: "2026-07-01", end: "2026-07-31" },
  { start: "2026-08-01", end: "2026-08-31" },
];

const weekWindows: Window[] = [
  { start: "2026-08-03", end: "2026-08-09" },
  { start: "2026-08-10", end: "2026-08-16" },
  { start: "2026-08-17", end: "2026-08-23" },
  { start: "2026-08-24", end: "2026-08-30" },
  { start: "2026-08-31", end: "2026-09-06" },
  { start: "2026-09-07", end: "2026-09-13" },
];

interface History {
  median: string | null;
  suggestedLimit: string | null;
  isSteady?: boolean;
  hasBudget?: boolean;
}

function history(
  categoryId: string,
  windows: Window[],
  spent: string[],
  { median, suggestedLimit, isSteady = false, hasBudget = false }: History,
): BudgetSuggestionResponse {
  return {
    categoryId,
    categoryName: categories.find((item) => item.id === categoryId)?.name ?? "",
    windows: windows.map((window, index) => ({ ...window, spent: spent[index] ?? "0.00" })),
    median,
    suggestedLimit,
    isSteady,
    hasBudget,
  };
}

export const budgetSuggestions: BudgetSuggestionsResponse = {
  period: "monthly",
  categories: [
    history(
      ids.categories.housing,
      monthWindows,
      ["650.00", "650.00", "650.00", "650.00", "650.00", "650.00"],
      {
        median: "650.00",
        suggestedLimit: "650.00",
        isSteady: true,
      },
    ),
    history(
      ids.categories.cafes,
      monthWindows,
      ["40.00", "0.00", "120.00", "15.00", "60.00", "35.00"],
      {
        median: "37.50",
        suggestedLimit: "38.00",
      },
    ),
    history(
      ids.categories.food,
      monthWindows,
      ["310.00", "295.00", "320.00", "305.00", "330.00", "312.40"],
      {
        median: "311.20",
        suggestedLimit: "312.00",
        isSteady: true,
        hasBudget: true,
      },
    ),
    history(
      ids.categories.telecom,
      monthWindows,
      ["29.99", "29.99", "29.99", "29.99", "29.99", "29.99"],
      {
        median: "29.99",
        suggestedLimit: "30.00",
        isSteady: true,
      },
    ),
    history(
      ids.categories.transport,
      monthWindows,
      ["80.00", "85.00", "78.00", "90.00", "82.00", "84.00"],
      {
        median: "83.00",
        suggestedLimit: "83.00",
        isSteady: true,
      },
    ),
  ],
};

export const weeklyBudgetSuggestions: BudgetSuggestionsResponse = {
  period: "weekly",
  categories: [
    history(
      ids.categories.food,
      weekWindows,
      ["70.00", "82.50", "64.10", "75.00", "90.00", "71.30"],
      {
        median: "73.15",
        suggestedLimit: "74.00",
      },
    ),
    history(
      ids.categories.transport,
      weekWindows,
      ["20.00", "18.00", "22.00", "19.00", "21.00", "20.00"],
      {
        median: "20.00",
        suggestedLimit: "20.00",
        isSteady: true,
        hasBudget: true,
      },
    ),
  ],
};

export const youngBudgetSuggestions: BudgetSuggestionsResponse = {
  period: "monthly",
  categories: [
    history(ids.categories.food, monthWindows.slice(-2), ["280.00", "301.00"], {
      median: null,
      suggestedLimit: null,
    }),
  ],
};
