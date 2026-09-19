import { createFileRoute } from "@tanstack/react-router";
import { getBudgetsSuspenseQueryOptions, getCategoriesSuspenseQueryOptions } from "@/api/generated";
import { BudgetsPage } from "@/features/budgets/budgets-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/budgets")({
  beforeLoad: requireFeature("budgets"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getBudgetsSuspenseQueryOptions());
  },
  component: BudgetsPage,
});
