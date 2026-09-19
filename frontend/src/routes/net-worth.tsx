import { createFileRoute } from "@tanstack/react-router";
import {
  getAssetsSuspenseQueryOptions,
  getDebtsSuspenseQueryOptions,
  getNetWorthHistorySuspenseQueryOptions,
  getNetWorthSuspenseQueryOptions,
} from "@/api/generated";
import { NetWorthPage } from "@/features/net-worth/net-worth-page";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/net-worth")({
  beforeLoad: requireFeature("netWorth"),
  loader: ({ context: { queryClient } }) => {
    warm(queryClient, getNetWorthSuspenseQueryOptions());
    warm(queryClient, getNetWorthHistorySuspenseQueryOptions());
    warm(queryClient, getAssetsSuspenseQueryOptions());
    warm(queryClient, getDebtsSuspenseQueryOptions());
  },
  component: NetWorthPage,
});
