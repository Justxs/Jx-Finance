import { createFileRoute } from "@tanstack/react-router";
import {
  getBudgetSuggestionsSuspenseQueryOptions,
  getBudgetsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
} from "@/api/generated";
import { BudgetsPage } from "@/features/budgets/budgets-page/budgets-page";
import { BudgetsPending } from "@/features/budgets/budgets-page/budgets-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/budgets")({
  beforeLoad: requireFeature("budgets"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getBudgetsSuspenseQueryOptions());
    warm(queryClient, getBudgetSuggestionsSuspenseQueryOptions({ period: "monthly" }));
  },
  component: BudgetsPage,
  pendingComponent: BudgetsPending,
});
