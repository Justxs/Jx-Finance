import { useTranslation } from "react-i18next";
import { CHART_COLOR_PRIMARY } from "@/components/chart";
import { type NetWorthSeries, NetWorthSeriesChart } from "./net-worth-series-chart";

interface Props {
  until?: string;
  pace?: boolean;
}

export function NetWorthHistoryChart({ until, pace }: Readonly<Props>) {
  const { t } = useTranslation();

  const series: NetWorthSeries[] = [
    { key: "netWorth", label: t("charts.netWorth"), color: CHART_COLOR_PRIMARY, shape: "line" },
  ];

  return (
    <NetWorthSeriesChart
      series={series}
      ariaLabel={t("charts.netWorthLabel")}
      yDomain={["auto", "auto"]}
      until={until}
      pace={pace}
    />
  );
}
