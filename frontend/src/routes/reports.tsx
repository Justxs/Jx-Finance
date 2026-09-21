import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getNetWorthHistorySuspenseQueryOptions,
  getReportSummarySuspenseQueryOptions,
} from "@/api/generated";
import { ReportComparisonMode } from "@/api/generated/model";
import { reportParams } from "@/features/reports/report-queries";
import { ReportsPage } from "@/features/reports/reports-page/reports-page";
import { requireFeature } from "@/lib/feature-gate";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";

export const reportsSearchSchema = z.object({
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
  comparison: z.enum(ReportComparisonMode).optional().catch(undefined),
});

export const Route = createFileRoute("/reports")({
  beforeLoad: requireFeature("reports"),
  validateSearch: reportsSearchSchema,
  loaderDeps: ({ search }) => ({
    dateFrom: search.dateFrom,
    dateTo: search.dateTo,
    comparison: search.comparison,
  }),
  loader: ({ context: { queryClient }, deps }) => {
    warmWithSettings(queryClient, (settings) => {
      warm(
        queryClient,
        getReportSummarySuspenseQueryOptions(reportParams(deps, todayDateIn(settings))),
      );
      if (settings.features.netWorth) {
        warm(queryClient, getNetWorthHistorySuspenseQueryOptions());
      }
    });
  },
  component: ReportsPage,
});
