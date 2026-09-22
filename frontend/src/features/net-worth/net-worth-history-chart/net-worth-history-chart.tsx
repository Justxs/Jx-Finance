import { useTranslation } from "react-i18next";
import { useNetWorthHistorySuspense } from "@/api/generated";
import { CHART_COLOR_PRIMARY, type ChartSeries } from "@/components/chart";
import { TimeSeriesLineChart } from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

export function NetWorthHistoryChart() {
  const { t } = useTranslation();
  const history = useNetWorthHistorySuspense();

  const items = history.data?.items ?? [];
  if (items.length < 2) {
    return <EmptyText>{t("netWorth.notEnoughHistory")}</EmptyText>;
  }

  const series: ChartSeries[] = [
    { key: "netWorth", label: t("charts.netWorth"), color: CHART_COLOR_PRIMARY, shape: "line" },
  ];

  return (
    <TimeSeriesLineChart
      data={items.map((item) => ({ date: item.date, netWorth: Number(item.netWorth ?? 0) }))}
      series={series}
      ariaLabel={t("charts.netWorthLabel")}
      yDomain={["auto", "auto"]}
      baseline
    />
  );
}
