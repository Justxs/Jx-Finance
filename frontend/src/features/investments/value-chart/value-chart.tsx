import { useTranslation } from "react-i18next";
import { useValueHistorySuspense } from "@/api/generated";
import type { ValueHistoryParams } from "@/api/generated/model";
import type { ChartSeries } from "@/components/chart";
import { TimeSeriesLineChart } from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

interface Props {
  params: ValueHistoryParams;
}

export function ValueChart({ params }: Readonly<Props>) {
  const { t } = useTranslation();
  const history = useValueHistorySuspense(params);
  const points = history.data?.points ?? [];

  if (points.length === 0) {
    return <EmptyText>{t("investments.valueChart.empty")}</EmptyText>;
  }

  const series: ChartSeries[] = [
    {
      key: "value",
      label: t("investments.valueChart.value"),
      color: "var(--chart-1)",
      shape: "line",
    },
    {
      key: "cost",
      label: t("investments.valueChart.cost"),
      color: "var(--muted-foreground)",
      shape: "line",
    },
  ];

  return (
    <div className="space-y-3">
      <TimeSeriesLineChart
        data={points.map((point) => ({
          date: point.date,
          value: Number(point.marketValue),
          cost: Number(point.costBasis),
        }))}
        series={series}
        ariaLabel={t("investments.valueChart.label")}
        yDomain={["auto", "auto"]}
        legend
        baseline
      />
      {points.some((point) => point.isPartial) ? (
        <p className="text-xs text-muted-foreground">{t("investments.valueChart.partial")}</p>
      ) : null}
    </div>
  );
}
