import { useTranslation } from "react-i18next";
import { useNetWorthHistorySuspense } from "@/api/generated";
import {
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
  type ChartSeries,
} from "@/components/chart";
import { TimeSeriesLineChart } from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

export function NetWorthCompositionChart() {
  const { t } = useTranslation();
  const history = useNetWorthHistorySuspense();

  const items = history.data?.items ?? [];
  if (items.length < 2) {
    return <EmptyText>{t("netWorth.notEnoughHistory")}</EmptyText>;
  }

  const series: ChartSeries[] = [
    { key: "accounts", label: t("netWorth.accounts"), color: CHART_COLOR_PRIMARY, shape: "line" },
    { key: "assets", label: t("netWorth.assets"), color: CHART_COLOR_POSITIVE, shape: "line" },
    { key: "debts", label: t("netWorth.debts"), color: CHART_COLOR_NEGATIVE, shape: "line" },
  ];

  return (
    <TimeSeriesLineChart
      data={items.map((item) => ({
        date: item.date,
        accounts: Number(item.accounts ?? 0),
        assets: Number(item.assets ?? 0),
        debts: Number(item.debts ?? 0),
      }))}
      series={series}
      ariaLabel={t("netWorth.compositionLabel")}
      legend
    />
  );
}
