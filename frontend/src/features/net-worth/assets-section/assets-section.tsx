import { Link } from "@tanstack/react-router";
import { ChartLine } from "lucide-react";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { getAssetsQueryKey, useDeleteAsset, useAssetsSuspense } from "@/api/generated";
import type { AssetResponse } from "@/api/generated/model";
import { buttonVariants } from "@/components/ui/button/button";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { optimisticRemoval } from "@/lib/optimistic";
import { metaLine } from "@/lib/utils";
import { HoldingsSection } from "../holdings-section";
import { AssetForm, type AssetFormValues, assetFormValues } from "./asset-form";

export function AssetsSection() {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const money = useMoney();
  const assets = useAssetsSuspense();

  const deleteMutation = useDeleteAsset({
    mutation: optimisticRemoval<AssetResponse>(getAssetsQueryKey()),
  });
  const assetList = useDeferredValue(assets.data);

  function historyLink(asset: AssetResponse) {
    const label = t("netWorth.asset.open", { name: asset.name });

    return (
      <Link
        to="/net-worth/assets/$assetId"
        params={{ assetId: asset.id }}
        aria-label={label}
        title={label}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <ChartLine />
      </Link>
    );
  }

  return (
    <HoldingsSection<AssetFormValues>
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
        values: assetFormValues(asset),
        action: historyLink(asset),
      }))}
      deleteMutation={deleteMutation}
      undoKind="asset"
      form={AssetForm}
    />
  );
}
