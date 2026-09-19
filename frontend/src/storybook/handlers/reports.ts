import type { ReportSummaryResponse } from "@/api/generated/model";
import { getReportSummaryMockHandler } from "@/api/generated/reports/reports.msw";
import {
  FIXTURE_MONTH_END,
  FIXTURE_MONTH_START,
  buildReportSummary,
  reportSummaryYear,
} from "@/storybook/fixtures";

function daysBetween(dateFrom: string, dateTo: string): number {
  return (Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${dateFrom}T00:00:00Z`)) / 86_400_000;
}

function resolveReport(params: URLSearchParams): ReportSummaryResponse {
  const dateFrom = params.get("dateFrom") ?? FIXTURE_MONTH_START;
  const dateTo = params.get("dateTo") ?? FIXTURE_MONTH_END;
  if (daysBetween(dateFrom, dateTo) > 92) {
    return { ...reportSummaryYear, periodStart: dateFrom, periodEnd: dateTo };
  }
  return buildReportSummary(dateFrom, dateTo);
}

export const reportHandlers = [
  getReportSummaryMockHandler(({ request }) => resolveReport(new URL(request.url).searchParams)),
];
