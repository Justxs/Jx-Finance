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
import { useNetWorthHistorySuspense } from "@/api/generated";
import { axisTick, chartCursor, type ChartSeries, ChartTooltip } from "@/components/chart";
import { useAxisMoney, useIsoDate } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";

export function NetWorthHistoryChart() {
  const { t, i18n } = useTranslation();
  const axisMoney = useAxisMoney();
  const formatDate = useIsoDate();
  const history = useNetWorthHistorySuspense();
  const tickFormat = new Intl.DateTimeFormat(i18n.language, { month: "short", year: "2-digit" });

  const items = history.data?.items ?? [];
  if (items.length < 2) {
    return <p className="py-6 text-sm text-muted-foreground">{t("netWorth.notEnoughHistory")}</p>;
  }

  const series: ChartSeries[] = [
    {
      key: "netWorth",
      label: t("charts.netWorth"),
      color: "var(--chart-1)",
      shape: "line",
    },
  ];

  const chartData = items.map((item) => ({
    date: item.date,
    netWorth: Number(item.netWorth ?? 0),
  }));

  function formatTick(value: string) {
    const parsed = parseIso(value);
    return parsed ? tickFormat.format(parsed) : value;
  }

  return (
    <div role="img" aria-label={t("charts.netWorthLabel")}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          accessibilityLayer={false}
          data={chartData}
          margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => formatTick(String(value))}
            minTickGap={48}
            tick={axisTick}
            axisLine={{ stroke: "var(--rule)" }}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(value) => axisMoney.format(Number(value))}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickCount={5}
            width={60}
          />
          <Tooltip
            cursor={chartCursor}
            content={<ChartTooltip series={series} formatLabel={formatDate} />}
            isAnimationActive={false}
            offset={12}
          />
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="netWorth"
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
  );
}
