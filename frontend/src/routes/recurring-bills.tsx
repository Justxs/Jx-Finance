import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getRecurringBillsSuspenseQueryOptions,
} from "@/api/generated";
import { RecurringBillsPage } from "@/features/recurring-bills/recurring-bills-page/recurring-bills-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/recurring-bills")({
  beforeLoad: requireFeature("recurringBills"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getRecurringBillsSuspenseQueryOptions());
  },
  component: RecurringBillsPage,
});
