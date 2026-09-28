import { useTranslation } from "react-i18next";
import { useAssetValueHistorySuspense } from "@/api/generated";
import { CHART_COLOR_POSITIVE, CHART_COLOR_PRIMARY } from "@/components/chart";
import {
  type TimeSeriesLine,
  TimeSeriesLineChart,
} from "@/components/chart/time-series-line-chart";

export function AssetValueChart({ assetId }: Readonly<{ assetId: string }>) {
  const { t } = useTranslation();
  const history = useAssetValueHistorySuspense(assetId).data;

  const series: TimeSeriesLine[] = [
    { key: "value", label: t("netWorth.asset.value"), color: CHART_COLOR_PRIMARY, shape: "line" },
    {
      key: "valuation",
      label: t("netWorth.asset.valuation"),
      color: CHART_COLOR_POSITIVE,
      shape: "bar",
      markers: true,
    },
  ];

  return (
    <TimeSeriesLineChart
      data={history.points.map((point) => ({
        date: point.date,
        value: Number(point.value),
        valuation: point.isValuation ? Number(point.value) : undefined,
      }))}
      series={series}
      ariaLabel={t("netWorth.asset.chartLabel")}
      yDomain={["auto", "auto"]}
      currency={history.currency}
      curve="stepAfter"
      legend
      baseline
    />
  );
}
