import { createFileRoute } from "@tanstack/react-router";
import {
  getAccountsSuspenseQueryOptions,
  getCategoriesSuspenseQueryOptions,
  getCategorizationRulesSuspenseQueryOptions,
  getTagsSuspenseQueryOptions,
} from "@/api/generated";
import { RulesPage } from "@/features/categorization-rules/rules-page/rules-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/categorization-rules")({
  beforeLoad: requireFeature("categorizationRules"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getCategorizationRulesSuspenseQueryOptions());
    warm(queryClient, getAccountsSuspenseQueryOptions());
    warm(queryClient, getCategoriesSuspenseQueryOptions());
    warm(queryClient, getTagsSuspenseQueryOptions());
  },
  component: RulesPage,
});
