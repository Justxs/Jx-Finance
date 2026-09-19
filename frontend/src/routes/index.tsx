import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getCategoryBreakdownSuspenseQueryOptions,
  getDashboardSummarySuspenseQueryOptions,
  getMonthlyTrendSuspenseQueryOptions,
  getTransactionsSuspenseQueryOptions,
} from "@/api/generated";
import { DashboardPage } from "@/features/dashboard/dashboard-page";
import {
  monthlyTrendParams,
  recentTransactionsParams,
} from "@/features/dashboard/dashboard-queries";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getDashboardSummarySuspenseQueryOptions());
    warm(queryClient, getCategoryBreakdownSuspenseQueryOptions());
    warm(queryClient, getMonthlyTrendSuspenseQueryOptions(monthlyTrendParams));
    warm(queryClient, getTransactionsSuspenseQueryOptions(recentTransactionsParams));
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
  },
  component: DashboardPage,
});
