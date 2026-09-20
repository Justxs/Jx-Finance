import { createFileRoute } from "@tanstack/react-router";
import { getHouseholdsSuspenseQueryOptions } from "@/api/generated";
import { HouseholdsPage } from "@/features/households/households-page/households-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/households")({
  beforeLoad: requireFeature("households"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getHouseholdsSuspenseQueryOptions());
  },
  component: HouseholdsPage,
});
