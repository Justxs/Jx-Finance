import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCashFlowForecastSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getDebtsSuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
  getSubscriptionCandidatesSuspenseQueryOptions,
} from "@/api/generated";
import { FORECAST_DAYS } from "@/features/accounts/cash-flow-forecast/forecast-series";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page";
import { RecurringBillsPending } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm, warmWithSettings } from "@/lib/route-prefetch";

export const Route = createFileRoute("/recurring-bills")({
  beforeLoad: requireFeature("recurringBills"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getRecurringBillsSuspenseQueryOptions());
    warm(queryClient, getSubscriptionCandidatesSuspenseQueryOptions());
    warm(queryClient, getCashFlowForecastSuspenseQueryOptions({ days: FORECAST_DAYS }));
    warmWithSettings(queryClient, (settings) => {
      if (settings.features.netWorth) {
        warm(queryClient, getDebtsSuspenseQueryOptions());
      }
    });
  },
  component: RecurringBillsPage,
  pendingComponent: RecurringBillsPending,
});
