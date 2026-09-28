import { createFileRoute } from "@tanstack/react-router";
import {
  getAssetValuationsSuspenseQueryOptions,
  getAssetValueHistorySuspenseQueryOptions,
  getAssetsSuspenseQueryOptions,
} from "@/api/generated";
import { AssetPage } from "@/features/net-worth/asset-page/asset-page";
import { AssetPending } from "@/features/net-worth/asset-page/asset-page-pending";
import { requireFeature } from "@/lib/feature-gate";
import { warm } from "@/lib/route-prefetch";

export const Route = createFileRoute("/net-worth_/assets/$assetId")({
  beforeLoad: requireFeature("netWorth"),
  loader: ({ context: { queryClient }, params }) => {
    warm(queryClient, getAssetsSuspenseQueryOptions());
    warm(queryClient, getAssetValueHistorySuspenseQueryOptions(params.assetId));
    warm(queryClient, getAssetValuationsSuspenseQueryOptions(params.assetId));
  },
  component: AssetRoute,
  pendingComponent: AssetPending,
});

function AssetRoute() {
  const { assetId } = Route.useParams();

  return <AssetPage assetId={assetId} />;
}
