import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getNetWorthHistorySuspenseQueryOptions,
  getReportSummarySuspenseQueryOptions,
} from "@/api/generated";
import { reportRange } from "@/features/reports/report-queries";
import { ReportsPage } from "@/features/reports/reports-page";
import { requireFeature } from "@/lib/feature-gate";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";

export const reportsSearchSchema = z.object({
  dateFrom: z.string().optional().catch(undefined),
  dateTo: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/reports")({
  beforeLoad: requireFeature("reports"),
  validateSearch: reportsSearchSchema,
  loaderDeps: ({ search }) => ({ dateFrom: search.dateFrom, dateTo: search.dateTo }),
  loader: ({ context: { queryClient }, deps }) => {
    warmWithSettings(queryClient, (settings) => {
      warm(
        queryClient,
        getReportSummarySuspenseQueryOptions(reportRange(deps, todayDateIn(settings))),
      );
      if (settings.features.netWorth) {
        warm(queryClient, getNetWorthHistorySuspenseQueryOptions());
      }
    });
  },
  component: ReportsPage,
});
