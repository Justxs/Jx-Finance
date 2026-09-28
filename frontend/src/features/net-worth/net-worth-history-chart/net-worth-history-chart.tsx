import { useTranslation } from "react-i18next";
import { CHART_COLOR_PRIMARY } from "@/components/chart";
import { type NetWorthSeries, NetWorthSeriesChart } from "./net-worth-series-chart";

export function NetWorthHistoryChart({ until }: Readonly<{ until?: string }>) {
  const { t } = useTranslation();

  const series: NetWorthSeries[] = [
    { key: "netWorth", label: t("charts.netWorth"), color: CHART_COLOR_PRIMARY, shape: "line" },
  ];

  return (
    <NetWorthSeriesChart
      series={series}
      ariaLabel={t("charts.netWorthLabel")}
      yDomain={["auto", "auto"]}
      baseline
      until={until}
    />
  );
}
