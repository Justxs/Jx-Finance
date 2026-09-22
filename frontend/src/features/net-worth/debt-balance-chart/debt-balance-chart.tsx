import { useTranslation } from "react-i18next";
import type { DebtSchedulePlan } from "@/api/generated/model";
import { CHART_COLOR_POSITIVE, CHART_COLOR_PRIMARY, type ChartSeries } from "@/components/chart";
import { TimeSeriesLineChart } from "@/components/chart/time-series-line-chart";

interface Props {
  plan: DebtSchedulePlan;
  withExtra: DebtSchedulePlan | null;
}

export function balancePoints(plan: DebtSchedulePlan, withExtra: DebtSchedulePlan | null) {
  return plan.rows.map((row, index) => ({
    date: row.date,
    balance: Number(row.balance),
    ...(withExtra ? { withExtra: Number(withExtra.rows[index]?.balance ?? 0) } : {}),
  }));
}

export function DebtBalanceChart({ plan, withExtra }: Readonly<Props>) {
  const { t } = useTranslation();

  const series: ChartSeries[] = [
    {
      key: "balance",
      label: t("netWorth.schedule.balance"),
      color: CHART_COLOR_PRIMARY,
      shape: "line",
    },
    ...(withExtra
      ? ([
          {
            key: "withExtra",
            label: t("netWorth.schedule.balanceWithExtra"),
            color: CHART_COLOR_POSITIVE,
            shape: "line",
          },
        ] satisfies ChartSeries[])
      : []),
  ];

  return (
    <TimeSeriesLineChart
      data={balancePoints(plan, withExtra)}
      series={series}
      ariaLabel={t("netWorth.schedule.balanceChartLabel")}
      legend={withExtra !== null}
      baseline
    />
  );
}
