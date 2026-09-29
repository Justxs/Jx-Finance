import { useTranslation } from "react-i18next";
import type { AccountForecastResponse } from "@/api/generated/model";
import { CHART_COLOR_PRIMARY } from "@/components/chart";
import {
  type TimeSeriesLine,
  TimeSeriesLineChart,
} from "@/components/chart/time-series-line-chart";
import { forecastSeries } from "./forecast-series";

interface Props {
  account: AccountForecastResponse;
  from: string;
  to: string;
  ariaLabel: string;
}

export function ForecastChart({ account, from, to, ariaLabel }: Readonly<Props>) {
  const { t } = useTranslation();
  const withSpending = account.usualDailySpending !== null;

  const series: TimeSeriesLine[] = [
    { key: "scheduled", label: t("forecast.scheduled"), color: CHART_COLOR_PRIMARY, shape: "line" },
    ...(withSpending
      ? [
          {
            key: "withSpending",
            label: t("forecast.withSpending"),
            color: CHART_COLOR_PRIMARY,
            shape: "line",
            comparison: true,
          } satisfies TimeSeriesLine,
        ]
      : []),
  ];

  return (
    <TimeSeriesLineChart
      data={forecastSeries(account, from, to)}
      series={series}
      ariaLabel={ariaLabel}
      currency={account.currency}
      curve="stepAfter"
      legend={withSpending}
      zeroLine
    />
  );
}
