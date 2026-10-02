import { useTranslation } from "react-i18next";
import type { Currency, DebtPaymentResponse, DebtSchedulePlan } from "@/api/generated/model";
import {
  CHART_COLOR_NEGATIVE,
  CHART_COLOR_POSITIVE,
  CHART_COLOR_PRIMARY,
  type ChartSeries,
} from "@/components/chart";
import { TimeSeriesLineChart } from "@/components/chart/time-series-line-chart";

interface TrackedBalance {
  from: string;
  until: string;
  opening: string;
  payments: readonly DebtPaymentResponse[];
}

interface Props {
  plan: DebtSchedulePlan;
  withExtra: DebtSchedulePlan | null;
  tracked?: TrackedBalance;
  currency: Currency;
}

function trackedOn(tracked: TrackedBalance, date: string) {
  if (date < tracked.from || date > tracked.until) {
    return undefined;
  }
  return Number(tracked.payments.findLast((item) => item.date <= date)?.balance ?? tracked.opening);
}

function balancePoints(
  plan: DebtSchedulePlan,
  withExtra: DebtSchedulePlan | null,
  tracked: TrackedBalance | undefined,
) {
  return plan.rows.map((row, index) => ({
    date: row.date,
    balance: Number(row.balance),
    ...(withExtra ? { withExtra: Number(withExtra.rows[index]?.balance ?? 0) } : {}),
    ...(tracked ? { tracked: trackedOn(tracked, row.date) } : {}),
  }));
}

export function DebtBalanceChart({ plan, withExtra, tracked, currency }: Readonly<Props>) {
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
    ...(tracked
      ? ([
          {
            key: "tracked",
            label: t("netWorth.schedule.balanceTracked"),
            color: CHART_COLOR_NEGATIVE,
            shape: "line",
          },
        ] satisfies ChartSeries[])
      : []),
  ];

  return (
    <TimeSeriesLineChart
      data={balancePoints(plan, withExtra, tracked)}
      series={series}
      ariaLabel={t("netWorth.schedule.balanceChartLabel")}
      currency={currency}
      legend={series.length > 1}
    />
  );
}
