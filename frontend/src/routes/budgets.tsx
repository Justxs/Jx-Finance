import { createFileRoute } from "@tanstack/react-router";
import {
  getBudgetSuggestionsSuspenseQueryOptions,
  getBudgetsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getTagsSuspenseQueryOptions,
} from "@/api/generated";
import { BudgetsPage } from "@/features/budgets/budgets-page/budgets-page";
import { BudgetsPending } from "@/features/budgets/budgets-page/budgets-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm, warmWithSettings } from "@/lib/route-prefetch";
import { readShare, withShare } from "@/stores/my-share-store";

export const Route = createFileRoute("/budgets")({
  beforeLoad: requireFeature("budgets"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warmWithSettings(queryClient, (settings) => {
      warm(
        queryClient,
        getBudgetsSuspenseQueryOptions(withShare(undefined, readShare(settings.features))),
      );
    });
    warm(queryClient, getTagsSuspenseQueryOptions());
    warm(queryClient, getBudgetSuggestionsSuspenseQueryOptions({ period: "monthly" }));
  },
  component: BudgetsPage,
  pendingComponent: BudgetsPending,
});
