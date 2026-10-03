import { createFileRoute } from "@tanstack/react-router";
import {
  getContactsSuspenseQueryOptions,
  getHouseholdsSuspenseQueryOptions,
} from "@/api/generated";
import { HouseholdsPage } from "@/features/households/households-page/households-page";
import { HouseholdsPending } from "@/features/households/households-page/households-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm, warmWithSettings } from "@/lib/route-prefetch";

export const Route = createFileRoute("/households")({
  beforeLoad: requireFeature("households"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getHouseholdsSuspenseQueryOptions());
    warmWithSettings(queryClient, (settings) => {
      if (settings.features.people) {
        warm(queryClient, getContactsSuspenseQueryOptions());
      }
    });
  },
  component: HouseholdsPage,
  pendingComponent: HouseholdsPending,
});
