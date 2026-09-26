import type {
  CategoryBreakdownItem,
  ReportComparisonMode,
  ReportSummaryResponse,
  ReportTrendPoint,
  TagBreakdownItem,
} from "@/api/generated/model";
import { fromCents, toCents } from "@/lib/money";
import { FIXTURE_MONTH_END, FIXTURE_MONTH_START, FIXTURE_YEAR_START, ids, totalOf } from "./base";
import { categories } from "./categories";
import { buildCategoryBreakdownItems, monthlyTrendItems } from "./dashboard";
import { tags } from "./tags";
import {
  buildTagBreakdownItems,
  sumByType,
  transactions,
  transactionsBetween,
} from "./transactions";

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
}

const INVESTMENT_INCOME_CENTS = 3816;
const INVESTMENT_TAXES_AND_FEES_CENTS = 572;

function investmentIncomeGroup(cents: number): CategoryBreakdownItem {
  return {
    categoryId: null,
    categoryName: "Investment income",
    categoryIcon: "coins",
    amount: fromCents(cents),
    syntheticGroup: "investmentIncome",
  };
}

function investmentTaxesAndFeesGroup(cents: number): CategoryBreakdownItem {
  return {
    categoryId: null,
    categoryName: "Investment taxes and fees",
    categoryIcon: "banknote",
    amount: fromCents(cents),
    syntheticGroup: "investmentTaxesAndFees",
  };
}

function buildDailyTrend(dateFrom: string, dateTo: string): ReportTrendPoint[] {
  const points: ReportTrendPoint[] = [];
  for (let day = dateFrom; day <= dateTo && points.length < 366; day = addDays(day, 1)) {
    const items = transactions.filter((item) => item.date === day);
    const investmentIncome = day === dateTo ? INVESTMENT_INCOME_CENTS : 0;
    const investmentExpense = day === dateTo ? INVESTMENT_TAXES_AND_FEES_CENTS : 0;
    points.push({
      bucketStart: day,
      income: fromCents(sumByType(items, "income") + investmentIncome),
      expense: fromCents(sumByType(items, "expense") + investmentExpense),
    });
  }
  return points;
}

export function buildReportSummary(dateFrom: string, dateTo: string): ReportSummaryResponse {
  const items = transactionsBetween(dateFrom, dateTo);
  const income = sumByType(items, "income") + INVESTMENT_INCOME_CENTS;
  const expense = sumByType(items, "expense") + INVESTMENT_TAXES_AND_FEES_CENTS;
  return {
    periodStart: dateFrom,
    periodEnd: dateTo,
    totalIncome: fromCents(income),
    totalExpense: fromCents(expense),
    net: fromCents(income - expense),
    expenseByCategory: [
      ...buildCategoryBreakdownItems(items),
      investmentTaxesAndFeesGroup(INVESTMENT_TAXES_AND_FEES_CENTS),
    ],
    incomeByCategory: [
      ...buildCategoryBreakdownItems(items, "income"),
      investmentIncomeGroup(INVESTMENT_INCOME_CENTS),
    ],
    trend: buildDailyTrend(dateFrom, dateTo),
    trendBucket: "day",
    expenseByTag: buildTagBreakdownItems(items),
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

function yearCategoryShare(
  categoryId: string,
  share: number,
  totalCents = yearExpenseCents,
): CategoryBreakdownItem {
  const match = categories.find((item) => item.id === categoryId);
  return {
    categoryId,
    categoryName: match?.name ?? "",
    categoryIcon: match?.icon ?? null,
    amount: fromCents(Math.round(totalCents * share)),
  };
}

function yearTagShare(tagId: string, share: number): TagBreakdownItem {
  return {
    tagId,
    tagName: tags.find((item) => item.id === tagId)?.name ?? "",
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
      amount: fromCents(Math.round(yearExpenseCents * 0.005)),
    },
    investmentTaxesAndFeesGroup(Math.round(yearExpenseCents * 0.005)),
  ],
  incomeByCategory: [
    yearCategoryShare(ids.categories.salary, 0.9, yearIncomeCents),
    yearCategoryShare(ids.categories.sideIncome, 0.06, yearIncomeCents),
    investmentIncomeGroup(Math.round(yearIncomeCents * 0.03)),
    yearCategoryShare(ids.categories.gifts, 0.01, yearIncomeCents),
  ],
  trend: yearTrend,
  trendBucket: "month",
  expenseByTag: [
    yearTagShare(ids.tags.renovation, 0.18),
    yearTagShare(ids.tags.car, 0.12),
    yearTagShare(ids.tags.children, 0.09),
    yearTagShare(ids.tags.holiday, 0.07),
    yearTagShare(ids.tags.reimbursable, 0.03),
    { tagId: null, tagName: "Untagged", amount: fromCents(Math.round(yearExpenseCents * 0.58)) },
  ],
};

function scaled(amount: string, factor: number): string {
  return fromCents(Math.round(toCents(amount) * factor));
}

function vanished(categoryId: string, amount: string): CategoryBreakdownItem {
  const match = categories.find((item) => item.id === categoryId);
  return {
    categoryId,
    categoryName: match?.name ?? "",
    categoryIcon: match?.icon ?? null,
    amount: "0.00",
    comparisonAmount: amount,
  };
}

const EARLIER_FACTORS = [0.78, 1.32, 0.94, 1.16, 1.0, 0.61, 1.45, 0.88];

function earlierFactor(index: number): number {
  return EARLIER_FACTORS[index % EARLIER_FACTORS.length] ?? 1;
}

export function withComparison(
  summary: ReportSummaryResponse,
  mode: ReportComparisonMode,
  periodStart: string,
  periodEnd: string,
): ReportSummaryResponse {
  const shift = daysBetween(periodStart, summary.periodStart);
  const expenseByCategory: CategoryBreakdownItem[] = [
    ...summary.expenseByCategory
      .filter((item) => item.categoryId !== ids.categories.health)
      .map((item, index) => ({
        ...item,
        comparisonAmount: scaled(item.amount, earlierFactor(index)),
      })),
    vanished(ids.categories.health, "184.40"),
  ];
  const incomeByCategory: CategoryBreakdownItem[] = summary.incomeByCategory.map((item, index) => ({
    ...item,
    comparisonAmount: scaled(item.amount, earlierFactor(index + 3)),
  }));
  const expenseByTag: TagBreakdownItem[] = [
    ...summary.expenseByTag
      .filter((item) => item.tagId !== ids.tags.children)
      .map((item, index) => ({
        ...item,
        comparisonAmount: scaled(item.amount, earlierFactor(index + 1)),
      })),
    { tagId: ids.tags.children, tagName: "Vaikai", amount: "0.00", comparisonAmount: "96.50" },
  ];
  const trend: ReportTrendPoint[] = summary.trend.map((point, index) => ({
    ...point,
    comparisonBucketStart: addDays(point.bucketStart, -shift),
    comparisonIncome: scaled(point.income, earlierFactor(index)),
    comparisonExpense: scaled(point.expense, earlierFactor(index + 2)),
  }));

  const earlierIncome = totalOf(trend.map((point) => point.comparisonIncome ?? "0.00"));
  const earlierExpense = totalOf(trend.map((point) => point.comparisonExpense ?? "0.00"));

  return {
    ...summary,
    expenseByCategory,
    incomeByCategory,
    expenseByTag,
    trend,
    comparison: {
      mode,
      periodStart,
      periodEnd,
      totalIncome: fromCents(earlierIncome),
      totalExpense: fromCents(earlierExpense),
      net: fromCents(earlierIncome - earlierExpense),
    },
  };
}

export const reportSummaryMonthCompared: ReportSummaryResponse = withComparison(
  reportSummaryMonth,
  "previousPeriod",
  "2026-08-02",
  "2026-08-31",
);

export const emptyReportSummary: ReportSummaryResponse = {
  periodStart: FIXTURE_MONTH_START,
  periodEnd: FIXTURE_MONTH_END,
  totalIncome: "0.00",
  totalExpense: "0.00",
  net: "0.00",
  expenseByCategory: [],
  incomeByCategory: [],
  trend: [],
  trendBucket: "day",
  expenseByTag: [],
};
