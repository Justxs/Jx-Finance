import type { ReportSummaryResponse } from "@/api/generated/model";
import { ReportComparisonMode } from "@/api/generated/model";
import { getReportSummaryMockHandler } from "@/api/generated/reports/reports.msw";
import {
  FIXTURE_MONTH_END,
  FIXTURE_MONTH_START,
  buildReportSummary,
  reportSummaryYear,
  withComparison,
} from "@/storybook/fixtures";
import { query } from "./http";

function daysBetween(dateFrom: string, dateTo: string): number {
  return (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000;
}

function shiftDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function modeOf(value: string | null): ReportComparisonMode {
  const known = Object.values(ReportComparisonMode).find((mode) => mode === value);
  return known ?? "none";
}

function earlierRange(dateFrom: string, dateTo: string, mode: ReportComparisonMode) {
  if (mode === "previousYear") {
    return { periodStart: shiftDays(dateFrom, -365), periodEnd: shiftDays(dateTo, -365) };
  }

  const length = daysBetween(dateFrom, dateTo) + 1;
  return { periodStart: shiftDays(dateFrom, -length), periodEnd: shiftDays(dateFrom, -1) };
}

function resolveReport(params: URLSearchParams): ReportSummaryResponse {
  const dateFrom = params.get("dateFrom") ?? FIXTURE_MONTH_START;
  const dateTo = params.get("dateTo") ?? FIXTURE_MONTH_END;
  const mode = modeOf(params.get("comparison"));
  const summary =
    daysBetween(dateFrom, dateTo) > 92
      ? { ...reportSummaryYear, periodStart: dateFrom, periodEnd: dateTo }
      : buildReportSummary(dateFrom, dateTo);

  if (mode === "none") {
    return summary;
  }

  const { periodStart, periodEnd } = earlierRange(dateFrom, dateTo, mode);
  return withComparison(summary, mode, periodStart, periodEnd);
}

export const reportHandlers = [
  getReportSummaryMockHandler(({ request }) => resolveReport(query(request))),
];
