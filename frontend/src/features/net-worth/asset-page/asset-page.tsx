import { useTranslation } from "react-i18next";
import { useAssetsSuspense } from "@/api/generated";
import type { AssetResponse } from "@/api/generated/model";
import { ChartSkeleton } from "@/components/chart/chart-skeleton";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { TitledSection } from "@/components/ui/section/section";
import { AssetValueChart } from "@/features/net-worth/asset-value-chart";
import { DetailPage } from "@/features/net-worth/detail-page/detail-page";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { ValuationsSkeleton } from "./asset-page-pending";
import { AssetValuations } from "./asset-valuations";

interface Props {
  assetId: string;
}

export function AssetPage({ assetId }: Readonly<Props>) {
  const { t } = useTranslation();
  const asset = useAssetsSuspense().data.find((item) => item.id === assetId);

  return (
    <DetailPage
      item={asset}
      fallbackTitle={t("netWorth.assets")}
      notFound={t("netWorth.asset.notFound")}
    >
      {(found) => (
        <>
          <AssetSummary asset={found} />
          <TitledSection title={t("netWorth.asset.chart")} bodyGap="md">
            <QueryBoundary
              fallback={<ChartSkeleton legend />}
              errorSubject={t("netWorth.asset.chart")}
            >
              <AssetValueChart assetId={found.id} />
            </QueryBoundary>
          </TitledSection>
          <QueryBoundary
            fallback={<ValuationsSkeleton />}
            errorSubject={t("netWorth.valuations.title")}
          >
            <AssetValuations asset={found} />
          </QueryBoundary>
        </>
      )}
    </DetailPage>
  );
}

function AssetSummary({ asset }: Readonly<{ asset: AssetResponse }>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const money = useMoney();

  return (
    <SummaryStats
      currency={asset.currency}
      items={[
        {
          label: t("netWorth.asset.valueToday"),
          value: asset.value,
          detail: t(`netWorth.assetTypes.${asset.type}`),
        },
        {
          label: t("netWorth.asset.lastValuation"),
          value: asset.currentValue,
          detail: formatDate(asset.asOf),
        },
        {
          label: t("netWorth.asset.monthly"),
          value: asset.monthlyDepreciation ?? undefined,
          detail: asset.depreciation
            ? t("netWorth.asset.residual", {
                amount: money.format(Number(asset.depreciation.residualValue), asset.currency),
              })
            : t("netWorth.asset.noDepreciation"),
        },
        {
          label: t("netWorth.asset.fullyDepreciatedOn"),
          value: undefined,
          text: asset.fullyDepreciatedOn ? formatDate(asset.fullyDepreciatedOn) : undefined,
        },
      ]}
    />
  );
}
