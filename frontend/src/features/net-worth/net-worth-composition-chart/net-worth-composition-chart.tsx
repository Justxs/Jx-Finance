import { useTranslation } from "react-i18next";
import {
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
} from "@/components/chart";
import {
  type NetWorthSeries,
  NetWorthSeriesChart,
} from "../net-worth-history-chart/net-worth-series-chart";

export function NetWorthCompositionChart() {
  const { t } = useTranslation();

  const series: NetWorthSeries[] = [
    { key: "accounts", label: t("netWorth.accounts"), color: CHART_COLOR_PRIMARY, shape: "line" },
    { key: "assets", label: t("netWorth.assets"), color: CHART_COLOR_POSITIVE, shape: "line" },
    { key: "debts", label: t("netWorth.debts"), color: CHART_COLOR_NEGATIVE, shape: "line" },
  ];

  return <NetWorthSeriesChart series={series} ariaLabel={t("netWorth.compositionLabel")} legend />;
}
