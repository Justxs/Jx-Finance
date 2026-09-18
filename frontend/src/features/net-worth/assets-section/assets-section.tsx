import { useQueryClient } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetAssetsEndpointQueryKey,
  getGetNetWorthEndpointQueryKey,
  getGetNetWorthHistoryEndpointQueryKey,
  useDeleteAssetEndpoint,
  useGetAssetsEndpointSuspense,
} from "@/api/generated";
import { useIsoDate } from "@/hooks/use-formatters";
import { HoldingsSection } from "../holdings-section";
import { AssetForm } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const formatDate = useIsoDate();
  const assets = useGetAssetsEndpointSuspense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetAssetsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetNetWorthHistoryEndpointQueryKey() });
  }

  const deleteMutation = useDeleteAssetEndpoint({ mutation: { onSettled: invalidate } });
  const assetList = useDeferredValue(assets.data) ?? [];

  return (
    <HoldingsSection
      title={t("netWorth.assets")}
      addLabel={t("netWorth.addAsset")}
      emptyLabel={t("netWorth.noAssets")}
      items={assetList.map((asset) => ({
        id: asset.id!,
        name: asset.name ?? "",
        details: `${t(`netWorth.assetTypes.${asset.type}`)} · ${formatDate(asset.asOf)}`,
        amount: Number(asset.currentValue),
      }))}
      deletingId={deleteMutation.isPending ? deleteMutation.variables?.id : undefined}
      deleteDisabled={deleteMutation.isPending}
      onDelete={(id) => deleteMutation.mutate({ id })}
      onCreated={invalidate}
      form={AssetForm}
    />
  );
}
