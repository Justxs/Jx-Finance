import { useTranslation } from "react-i18next";
import { useReportSummarySuspense } from "@/api/generated";
import type { ReportTrendPoint } from "@/api/generated/model";
import { CHART_COLOR_PRIMARY } from "@/components/chart";
import {
  type TimeSeriesLine,
  TimeSeriesLineChart,
} from "@/components/chart/time-series-line-chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { useTodayDate } from "@/hooks/use-settings";
import { parseIso } from "@/lib/calendar";
import { spendingPaceRanges } from "../dashboard-queries";

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

function lastDayOf(isoDate: string | null | undefined) {
  return parseIso(isoDate ?? "")?.getDate() ?? 0;
}

export function SpendingPaceChart() {
  const { t } = useTranslation();
  const today = useTodayDate();
  const ranges = spendingPaceRanges(today);
  const current = useReportSummarySuspense(ranges.current);
  const previous = useReportSummarySuspense(ranges.previous);

  const daysInMonth = lastDayOf(ranges.current.dateTo);
  const daysInPrevious = lastDayOf(ranges.previous.dateTo);
  const currentTotals = cumulativeByDay(current.data.trend, today.getDate());
  const previousTotals = cumulativeByDay(previous.data.trend, daysInPrevious);

  const series: TimeSeriesLine[] = [
    {
      key: "current",
      label: t("dashboard.pace.current"),
      color: CHART_COLOR_PRIMARY,
      shape: "line",
    },
    {
      key: "previous",
      label: t("dashboard.pace.previous"),
      color: "var(--muted-foreground)",
      shape: "line",
      comparison: true,
    },
  ];

  const chartData = Array.from({ length: Math.max(daysInMonth, daysInPrevious) }, (_, index) => ({
    day: index + 1,
    current: currentTotals[index],
    previous: previousTotals[index],
  }));

  if ((currentTotals.at(-1) ?? 0) === 0 && (previousTotals.at(-1) ?? 0) === 0) {
    return <EmptyText>{t("dashboard.noSpending")}</EmptyText>;
  }

  return (
    <TimeSeriesLineChart
      data={chartData}
      series={series}
      ariaLabel={t("dashboard.pace.label")}
      xAxis="day"
      curve="stepAfter"
      formatLabel={(day) => t("dashboard.pace.day", { day })}
      legend
    />
  );
}
