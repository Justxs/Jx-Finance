import { useQuery, useSuspenseQueries } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  getRecurringBillsSuspenseQueryOptions,
  getReportSummarySuspenseQueryOptions,
  useReportSummarySuspense,
} from "@/api/generated";
import type { ReportTrendPoint } from "@/api/generated/model";
import { CHART_COLOR_PRIMARY } from "@/components/chart";
import {
  type TimeSeriesLine,
  TimeSeriesLineChart,
} from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { monthDate, shiftMonth } from "@/features/month-close/month-key";
import { useShortMonth } from "@/hooks/use-formatters";
import { useSettingsSuspense, useTodayDate } from "@/hooks/use-settings";
import { parseIso } from "@/lib/calendar";
import { currentMonthKey, spendingPaceRanges } from "../dashboard-queries";
import { billsDueAfter, projectedTotals } from "./pace-projection";

function cumulativeByDay(points: readonly ReportTrendPoint[], lastDay: number) {
  const perDay = new Map<number, number>();
  for (const point of points) {
    const day = parseIso(point.bucketStart ?? "")?.getDate();
    if (day !== undefined) {
      perDay.set(day, (perDay.get(day) ?? 0) + Number(point.expense ?? 0));
    }
  }

  const totals: number[] = [];
  let running = 0;
  for (let day = 1; day <= lastDay; day += 1) {
    running += perDay.get(day) ?? 0;
    totals.push(running);
  }
  return totals;
}

function averageByDay(months: readonly number[][], days: number) {
  const spent = months.filter((totals) => (totals.at(-1) ?? 0) > 0);
  if (spent.length === 0) {
    return [];
  }
  return Array.from(
    { length: days },
    (_, index) => spent.reduce((sum, totals) => sum + (totals[index] ?? 0), 0) / spent.length,
  );
}

function lastDayOf(isoDate: string | null | undefined) {
  return parseIso(isoDate ?? "")?.getDate() ?? 0;
}

interface Props {
  month: string;
}

export function SpendingPaceChart({ month }: Readonly<Props>) {
  const { t } = useTranslation();
  const monthFormat = useShortMonth();
  const today = useTodayDate();
  const { features } = useSettingsSuspense();
  const isCurrent = month === currentMonthKey(today);
  const ranges = spendingPaceRanges(month);
  const current = useReportSummarySuspense(ranges.current);
  const earlier = useSuspenseQueries({
    queries: ranges.earlier.map((range) => getReportSummarySuspenseQueryOptions(range)),
  });
  const bills = useQuery({
    ...getRecurringBillsSuspenseQueryOptions(),
    enabled: isCurrent && features.recurringBills,
  });

  const daysInMonth = lastDayOf(ranges.current.dateTo);
  const shownDays = isCurrent ? today.getDate() : daysInMonth;
  const currentTotals = cumulativeByDay(current.data.trend, shownDays);
  const averageTotals = averageByDay(
    earlier.map((query) => cumulativeByDay(query.data.trend, daysInMonth)),
    daysInMonth,
  );
  const projection = isCurrent
    ? projectedTotals(
        currentTotals.at(-1) ?? 0,
        shownDays,
        averageTotals,
        billsDueAfter(bills.data ?? [], today, daysInMonth),
        daysInMonth,
      )
    : [];
  const currentLabel = monthFormat.format(monthDate(month));
  const span = {
    from: monthFormat.format(monthDate(shiftMonth(month, -ranges.earlier.length))),
    to: monthFormat.format(monthDate(shiftMonth(month, -1))),
  };

  const series: TimeSeriesLine[] = [
    {
      key: "current",
      label: currentLabel,
      color: CHART_COLOR_PRIMARY,
      shape: "line",
    },
    ...(projection.length > 0
      ? [
          {
            key: "projection",
            label: t("dashboard.pace.projection"),
            color: CHART_COLOR_PRIMARY,
            shape: "line",
            comparison: true,
          } satisfies TimeSeriesLine,
        ]
      : []),
    {
      key: "average",
      label: t("dashboard.pace.average", span),
      color: "var(--muted-foreground)",
      shape: "line",
      comparison: true,
    },
  ];

  const chartData = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    current: currentTotals[index],
    average: averageTotals[index],
    projection: projection[index],
  }));

  if ((currentTotals.at(-1) ?? 0) === 0 && averageTotals.length === 0) {
    return <EmptyText>{t("dashboard.noSpending")}</EmptyText>;
  }

  return (
    <TimeSeriesLineChart
      data={chartData}
      series={series}
      ariaLabel={t("dashboard.pace.label", { month: currentLabel, ...span })}
      xAxis="day"
      curve="stepAfter"
      formatLabel={(day) => t("dashboard.pace.day", { day })}
      legend
    />
  );
}
