import type {
  CategoryBreakdownItem,
  ReportSummaryResponse,
  ReportTrendPoint,
} from "@/api/generated/model";
import {
  FIXTURE_MONTH_END,
  FIXTURE_MONTH_START,
  FIXTURE_YEAR_START,
  fromCents,
  ids,
  totalOf,
} from "./base";
import { categories } from "./categories";
import { buildCategoryBreakdownItems, monthlyTrendItems } from "./dashboard";
import { sumByType, transactions, transactionsBetween } from "./transactions";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function buildDailyTrend(dateFrom: string, dateTo: string): ReportTrendPoint[] {
  const points: ReportTrendPoint[] = [];
  for (let day = dateFrom; day <= dateTo && points.length < 366; day = addDays(day, 1)) {
    const items = transactions.filter((item) => item.date === day);
    points.push({
      bucketStart: day,
      income: fromCents(sumByType(items, "income")),
      expense: fromCents(sumByType(items, "expense")),
    });
  }
  return points;
}

export function buildReportSummary(dateFrom: string, dateTo: string): ReportSummaryResponse {
  const items = transactionsBetween(dateFrom, dateTo);
  const income = sumByType(items, "income");
  const expense = sumByType(items, "expense");
  return {
    periodStart: dateFrom,
    periodEnd: dateTo,
    totalIncome: fromCents(income),
    totalExpense: fromCents(expense),
    net: fromCents(income - expense),
    expenseByCategory: buildCategoryBreakdownItems(items),
    trend: buildDailyTrend(dateFrom, dateTo),
    trendBucket: "day",
  };
}

export const reportSummaryMonth: ReportSummaryResponse = buildReportSummary(
  FIXTURE_MONTH_START,
  FIXTURE_MONTH_END,
);

const yearTrend: ReportTrendPoint[] = [
  { bucketStart: "2025-10-01", income: "4990.00", expense: "3011.27" },
  { bucketStart: "2025-11-01", income: "4990.00", expense: "3340.80" },
  { bucketStart: "2025-12-01", income: "6890.00", expense: "5122.64" },
  { bucketStart: "2026-01-01", income: "4990.00", expense: "2790.15" },
  { bucketStart: "2026-02-01", income: "4990.00", expense: "2688.93" },
  { bucketStart: "2026-03-01", income: "5240.00", expense: "3075.50" },
  ...monthlyTrendItems.map((item) => ({
    bucketStart: `${item.year}-${String(item.month).padStart(2, "0")}-01`,
    income: item.income,
    expense: item.expense,
  })),
];

const yearIncomeCents = totalOf(yearTrend.map((item) => item.income));
const yearExpenseCents = totalOf(yearTrend.map((item) => item.expense));

function yearCategoryShare(categoryId: string, share: number): CategoryBreakdownItem {
  const match = categories.find((item) => item.id === categoryId);
  return {
    categoryId,
    categoryName: match?.name ?? "",
    categoryIcon: match?.icon ?? null,
    amount: fromCents(Math.round(yearExpenseCents * share)),
  };
}

export const reportSummaryYear: ReportSummaryResponse = {
  periodStart: FIXTURE_YEAR_START,
  periodEnd: FIXTURE_MONTH_END,
  totalIncome: fromCents(yearIncomeCents),
  totalExpense: fromCents(yearExpenseCents),
  net: fromCents(yearIncomeCents - yearExpenseCents),
  expenseByCategory: [
    yearCategoryShare(ids.categories.housing, 0.31),
    yearCategoryShare(ids.categories.food, 0.24),
    yearCategoryShare(ids.categories.utilities, 0.11),
    yearCategoryShare(ids.categories.transport, 0.1),
    yearCategoryShare(ids.categories.shopping, 0.08),
    yearCategoryShare(ids.categories.householdGoods, 0.05),
    yearCategoryShare(ids.categories.cafes, 0.04),
    yearCategoryShare(ids.categories.entertainment, 0.03),
    yearCategoryShare(ids.categories.health, 0.02),
    yearCategoryShare(ids.categories.telecom, 0.01),
    {
      categoryId: null,
      categoryName: "Uncategorized",
      categoryIcon: null,
      amount: fromCents(Math.round(yearExpenseCents * 0.01)),
    },
  ],
  trend: yearTrend,
  trendBucket: "month",
};

export const emptyReportSummary: ReportSummaryResponse = {
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
  totalIncome: "0.00",
  totalExpense: "0.00",
  net: "0.00",
  expenseByCategory: [],
  trend: [],
  trendBucket: "day",
};
