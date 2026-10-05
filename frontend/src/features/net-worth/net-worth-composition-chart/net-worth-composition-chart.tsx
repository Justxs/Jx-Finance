import { useTranslation } from "react-i18next";
import {
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
} from "@/components/chart";
import {
  type NetWorthSeries,
  NetWorthSeriesChart,
} from "@/components/net-worth-history-chart/net-worth-series-chart";

export function NetWorthCompositionChart() {
  const { t } = useTranslation();

  const series: NetWorthSeries[] = [
    { key: "accounts", label: t("netWorth.accounts"), color: CHART_COLOR_PRIMARY, shape: "line" },
    { key: "assets", label: t("netWorth.assets"), color: CHART_COLOR_POSITIVE, shape: "dashed" },
    { key: "debts", label: t("netWorth.debts"), color: CHART_COLOR_NEGATIVE, shape: "dotted" },
  ];

  return <NetWorthSeriesChart series={series} ariaLabel={t("netWorth.compositionLabel")} legend />;
}
