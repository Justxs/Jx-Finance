import { useNavigate } from "@tanstack/react-router";
import { ChartLine } from "lucide-react";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { getAssetsQueryKey, useDeleteAsset, useAssetsSuspense } from "@/api/generated";
import type { AssetResponse } from "@/api/generated/model";
import { BalanceItemsSection } from "@/features/net-worth/balance-items-section/balance-items-section";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { optimisticRemoval } from "@/lib/optimistic";
import { metaLine } from "@/lib/utils";
import { AssetForm } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const money = useMoney();
  const assets = useAssetsSuspense();
  const navigate = useNavigate();

  const deleteMutation = useDeleteAsset({
    mutation: optimisticRemoval<AssetResponse>(getAssetsQueryKey()),
  });
  const assetList = useDeferredValue(assets.data);

  return (
    <BalanceItemsSection
      title={t("netWorth.assets")}
      addLabel={t("netWorth.addAsset")}
      emptyLabel={t("netWorth.noAssets")}
      items={assetList.map((asset) => ({
        id: asset.id,
        name: asset.name,
        details: metaLine(
          t(`netWorth.assetTypes.${asset.type}`),
          formatDate(asset.asOf),
          asset.monthlyDepreciation &&
            Number(asset.value) > Number(asset.depreciation?.residualValue)
            ? t("netWorth.depreciation.perMonth", {
                amount: money.format(Number(asset.monthlyDepreciation), asset.currency),
              })
            : null,
        ),
        amount: Number(asset.value),
        currency: asset.currency,
        record: asset,
        action: {
          icon: ChartLine,
          label: t("netWorth.asset.open"),
          onSelect: () =>
            navigate({ to: "/net-worth/assets/$assetId", params: { assetId: asset.id } }),
        },
        scope: asset.scope,
        householdId: asset.householdId,
        isMine: asset.isMine,
      }))}
      deleteMutation={deleteMutation}
      undoKind="asset"
      form={AssetForm}
    />
  );
}
