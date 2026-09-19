import type {
  CategoryBreakdownItem,
  CategoryBreakdownResponse,
  DashboardSummaryResponse,
  MonthlyTrendItem,
  MonthlyTrendResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { FIXTURE_MONTH_END, FIXTURE_MONTH_START, fromCents } from "./base";
import { categories } from "./categories";
import { netWorth } from "./net-worth";
import {
  expenseParts,
  monthExpenseCents,
  monthIncomeCents,
  monthTransactions,
} from "./transactions";

export function buildCategoryBreakdownItems(items: TransactionResponse[]): CategoryBreakdownItem[] {
  const totals = new Map<string | null, number>();
  for (const part of expenseParts(items)) {
    totals.set(part.categoryId, (totals.get(part.categoryId) ?? 0) + part.cents);
  }
  return [...totals.entries()]
    .toSorted((a, b) => b[1] - a[1])
    .map(([categoryId, cents]) => {
      const match = categories.find((item) => item.id === categoryId);
      return {
        categoryId,
        categoryName: match?.name ?? "Uncategorized",
        categoryIcon: match?.icon ?? null,
        amount: fromCents(cents),
      };
    });
}

export const dashboardSummary: DashboardSummaryResponse = {
  totalBalance: netWorth.accounts,
  monthIncome: fromCents(monthIncomeCents),
  monthExpense: fromCents(monthExpenseCents),
  monthStart: FIXTURE_MONTH_START,
  monthEnd: FIXTURE_MONTH_END,
};

export const emptyDashboardSummary: DashboardSummaryResponse = {
  totalBalance: "0.00",
  monthIncome: "0.00",
  monthExpense: "0.00",
  monthStart: FIXTURE_MONTH_START,
  monthEnd: FIXTURE_MONTH_END,
};

export const monthlyTrendItems: MonthlyTrendItem[] = [
  { year: 2026, month: 4, income: "5010.00", expense: "3120.45" },
  { year: 2026, month: 5, income: "4990.00", expense: "2876.10" },
  { year: 2026, month: 6, income: "6240.00", expense: "3954.72" },
  { year: 2026, month: 7, income: "4990.00", expense: "4410.38" },
  { year: 2026, month: 8, income: "5090.00", expense: "3287.91" },
  {
    year: 2026,
    month: 9,
    income: fromCents(monthIncomeCents),
    expense: fromCents(monthExpenseCents),
  },
];

export const monthlyTrend: MonthlyTrendResponse = { items: monthlyTrendItems };

export const categoryBreakdownItems: CategoryBreakdownItem[] =
  buildCategoryBreakdownItems(monthTransactions);

export const categoryBreakdown: CategoryBreakdownResponse = {
  items: categoryBreakdownItems,
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
};

export const emptyCategoryBreakdown: CategoryBreakdownResponse = {
  items: [],
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
};
