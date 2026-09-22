import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { getAssetsQueryKey, useDeleteAsset, useAssetsSuspense } from "@/api/generated";
import type { AssetResponse } from "@/api/generated/model";
import { useIsoDate } from "@/hooks/use-formatters";
import { pendingId } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { HoldingsSection } from "../holdings-section";
import { AssetForm } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const assets = useAssetsSuspense();

  const deleteMutation = useDeleteAsset({
    mutation: optimisticRemoval<AssetResponse>(getAssetsQueryKey()),
  });
  const assetList = useDeferredValue(assets.data) ?? [];

  return (
    <HoldingsSection
      title={t("netWorth.assets")}
      addLabel={t("netWorth.addAsset")}
      emptyLabel={t("netWorth.noAssets")}
      items={assetList.map((asset) => ({
        id: asset.id,
        name: asset.name ?? "",
        details: `${t(`netWorth.assetTypes.${asset.type}`)} · ${formatDate(asset.asOf)}`,
        amount: Number(asset.currentValue),
        values: {
          name: asset.name ?? "",
          type: asset.type,
          amount: asset.currentValue,
          interestRate: "",
          asOf: asset.asOf,
        },
      }))}
      deletingId={pendingId(deleteMutation)}
      deleteDisabled={deleteMutation.isPending}
      onDelete={(id, options) => deleteMutation.mutate({ id }, options)}
      undoKind="asset"
      form={AssetForm}
    />
  );
}
