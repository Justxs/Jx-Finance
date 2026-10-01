import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  getAccountsSuspenseQueryOptions,
  getBillsCalendarSuspenseQueryOptions,
  getCashFlowForecastSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getDebtsSuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
  getRecurringTotalsSuspenseQueryOptions,
  getSubscriptionCandidatesSuspenseQueryOptions,
} from "@/api/generated";
import { FORECAST_DAYS } from "@/features/accounts/cash-flow-forecast/forecast-series";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page";
import { RecurringBillsPending } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page-pending";
import { MONTH_KEY_PATTERN, monthKeyOfIso, todayInZone } from "@/lib/calendar";
import { requireFeature } from "@/lib/feature-gate";
import { warm, warmWithSettings } from "@/lib/route-prefetch";
import { optionalParam } from "@/lib/search-schema";

export const recurringBillsSearchSchema = z.object({
  view: optionalParam(z.enum(["list", "calendar"])),
  month: optionalParam(z.string().regex(MONTH_KEY_PATTERN)),
});

export const Route = createFileRoute("/recurring-bills")({
  beforeLoad: requireFeature("recurringBills"),
  validateSearch: recurringBillsSearchSchema,
  loaderDeps: ({ search }) => ({ view: search.view, month: search.month }),
  loader: ({ context: { queryClient }, deps }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getRecurringBillsSuspenseQueryOptions());
    warm(queryClient, getSubscriptionCandidatesSuspenseQueryOptions());
    warm(queryClient, getRecurringTotalsSuspenseQueryOptions());
    if (deps.view !== "calendar") {
      warm(queryClient, getCashFlowForecastSuspenseQueryOptions({ days: FORECAST_DAYS }));
    }
    warmWithSettings(queryClient, (settings) => {
      if (settings.features.netWorth) {
        warm(queryClient, getDebtsSuspenseQueryOptions());
      }
      if (deps.view === "calendar") {
        const month = deps.month ?? monthKeyOfIso(todayInZone(settings.timeZone));
        warm(queryClient, getBillsCalendarSuspenseQueryOptions({ month }));
      }
    });
  },
  component: RecurringBillsPage,
  pendingComponent: RecurringBillsPending,
});
