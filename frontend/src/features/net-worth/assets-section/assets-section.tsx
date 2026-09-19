import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteAsset, useGetAssetsSuspense } from "@/api/generated";
import { useIsoDate } from "@/hooks/use-formatters";
import { HoldingsSection } from "../holdings-section";
import { AssetForm } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const assets = useGetAssetsSuspense();

  const deleteMutation = useDeleteAsset();
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
      deletingId={deleteMutation.isPending ? deleteMutation.variables?.id : undefined}
      deleteDisabled={deleteMutation.isPending}
      onDelete={(id) => deleteMutation.mutate({ id })}
      form={AssetForm}
    />
  );
}
