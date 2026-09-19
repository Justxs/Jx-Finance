import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getBudgetsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getCategoryBreakdownSuspenseQueryOptions,
  getDashboardSummarySuspenseQueryOptions,
  getMonthlyTrendSuspenseQueryOptions,
  getNetWorthHistorySuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
  getReportSummarySuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import {
  monthlyTrendParams,
  recentTransactionsParams,
  spendingPaceRanges,
} from "@/features/dashboard/dashboard-queries";
import { todayDateIn, warm, warmWithSettings } from "@/lib/route-prefetch";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getDashboardSummarySuspenseQueryOptions());
    warm(queryClient, getCategoryBreakdownSuspenseQueryOptions());
    warm(queryClient, getMonthlyTrendSuspenseQueryOptions(monthlyTrendParams));
    warm(queryClient, getTransactionsSuspenseQueryOptions(recentTransactionsParams));
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getBudgetsSuspenseQueryOptions());
    warm(queryClient, getNetWorthHistorySuspenseQueryOptions());
    warm(queryClient, getRecurringBillsSuspenseQueryOptions());
    warmWithSettings(queryClient, (settings) => {
      const ranges = spendingPaceRanges(todayDateIn(settings));
      warm(queryClient, getReportSummarySuspenseQueryOptions(ranges.current));
      warm(queryClient, getReportSummarySuspenseQueryOptions(ranges.previous));
    });
  },
  component: DashboardPage,
});
