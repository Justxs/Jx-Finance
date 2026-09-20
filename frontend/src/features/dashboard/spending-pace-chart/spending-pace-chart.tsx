import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useReportSummarySuspense } from "@/api/generated";
import type { ReportTrendPoint } from "@/api/generated/model";
import {
  axisProps,
  chartCursor,
  ChartLegend,
  type ChartSeries,
  ChartTooltip,
} from "@/components/chart";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { useAxisMoney } from "@/hooks/use-formatters";
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

export function SpendingPaceChart() {
  const { t } = useTranslation();
  const axisMoney = useAxisMoney();
  const today = useTodayDate();
  const ranges = spendingPaceRanges(today);
  const current = useReportSummarySuspense(ranges.current);
  const previous = useReportSummarySuspense(ranges.previous);

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysInPrevious = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
  const currentTotals = cumulativeByDay(current.data.trend, today.getDate());
  const previousTotals = cumulativeByDay(previous.data.trend, daysInPrevious);

  const series: ChartSeries[] = [
    { key: "current", label: t("dashboard.pace.current"), color: "var(--chart-1)", shape: "line" },
    {
      key: "previous",
      label: t("dashboard.pace.previous"),
      color: "var(--muted-foreground)",
      shape: "line",
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
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={t("dashboard.pace.label")}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            accessibilityLayer={false}
            data={chartData}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              {...axisProps}
              tickMargin={8}
              minTickGap={24}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(value) => axisMoney.format(Number(value))}
              {...axisProps}
              tickCount={5}
              width={56}
            />
            <Tooltip
              cursor={chartCursor}
              content={
                <ChartTooltip
                  series={series}
                  formatLabel={(day) => t("dashboard.pace.day", { day })}
                />
              }
              isAnimationActive={false}
              offset={12}
            />
            <Line
              isAnimationActive={false}
              type="stepAfter"
              dataKey="previous"
              stroke="var(--muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              dot={false}
              activeDot={false}
            />
            <Line
              isAnimationActive={false}
              type="stepAfter"
              dataKey="current"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: "var(--chart-1)",
                stroke: "var(--background)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
