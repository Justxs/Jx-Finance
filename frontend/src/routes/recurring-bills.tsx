import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCashFlowForecastSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
  getSubscriptionCandidatesSuspenseQueryOptions,
} from "@/api/generated";
import { FORECAST_DAYS } from "@/features/accounts/cash-flow-forecast/forecast-series";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page";
import { RecurringBillsPending } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/recurring-bills")({
  beforeLoad: requireFeature("recurringBills"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getRecurringBillsSuspenseQueryOptions());
    warm(queryClient, getSubscriptionCandidatesSuspenseQueryOptions());
    warm(queryClient, getCashFlowForecastSuspenseQueryOptions({ days: FORECAST_DAYS }));
  },
  component: RecurringBillsPage,
  pendingComponent: RecurringBillsPending,
});
