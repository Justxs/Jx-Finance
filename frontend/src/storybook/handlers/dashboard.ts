import {
  getCategoryBreakdownMockHandler,
  getDashboardSummaryMockHandler,
  getMonthlyTrendMockHandler,
} from "@/api/generated/dashboard/dashboard.msw";
import type { CategoryBreakdownResponse, MonthlyTrendResponse } from "@/api/generated/model";
import {
  FIXTURE_MONTH,
  buildCategoryBreakdownItems,
  categoryBreakdown,
  dashboardSummary,
  monthlyTrendItems,
  transactionsBetween,
} from "@/storybook/fixtures";

function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year ?? 2026, monthNumber ?? 9, 0)).getUTCDate();
  return { start: `${month}-01`, end: `${month}-${String(lastDay).padStart(2, "0")}` };
}

function resolveBreakdown(params: URLSearchParams): CategoryBreakdownResponse {
  const month = params.get("month");
  if (!month || month === FIXTURE_MONTH || !/^\d{4}-\d{2}$/.test(month)) {
    return categoryBreakdown;
  }
  const { start, end } = monthBounds(month);
  return {
    items: buildCategoryBreakdownItems(transactionsBetween(start, end)),
    periodStart: start,
    periodEnd: end,
  };
}

function resolveTrend(params: URLSearchParams): MonthlyTrendResponse {
  const months = Math.max(1, Number(params.get("months") ?? 6) || 6);
  return { items: monthlyTrendItems.slice(-months) };
}

export const dashboardHandlers = [
  getDashboardSummaryMockHandler(dashboardSummary),
  getMonthlyTrendMockHandler(({ request }) => resolveTrend(new URL(request.url).searchParams)),
  getCategoryBreakdownMockHandler(({ request }) =>
    resolveBreakdown(new URL(request.url).searchParams),
  ),
];
