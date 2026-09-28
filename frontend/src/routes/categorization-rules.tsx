import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getCategorizationRulesSuspenseQueryOptions,
  getSuggestedRulesSuspenseQueryOptions,
  getTagsSuspenseQueryOptions,
} from "@/api/generated";
import { RulesPage } from "@/features/categorization-rules/rules-page/rules-page";
import { RulesPending } from "@/features/categorization-rules/rules-page/rules-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/categorization-rules")({
  beforeLoad: requireFeature("categorizationRules"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getCategorizationRulesSuspenseQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getTagsSuspenseQueryOptions());
    warm(queryClient, getSuggestedRulesSuspenseQueryOptions());
  },
  component: RulesPage,
  pendingComponent: RulesPending,
});
