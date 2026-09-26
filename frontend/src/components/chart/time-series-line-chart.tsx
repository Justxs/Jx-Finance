import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAxisDateTick, useAxisMoney, useIsoDate } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";
import { ChartLegend } from "./chart-legend";
import { axisProps, chartCursor } from "./chart-theme";
import { type ChartSeries, ChartTooltip } from "./chart-tooltip";

const SHORT_SPAN_MS = 92 * 24 * 60 * 60 * 1000;

const X_AXES = {
  date: { dataKey: "date", marginRight: 24, yWidth: 60, minTickGap: 48, interval: undefined },
  day: {
    dataKey: "day",
    marginRight: 12,
    yWidth: 56,
    minTickGap: 24,
    interval: "preserveStartEnd",
  },
} as const;

type TimeSeriesPoint = Readonly<Record<string, string | number | undefined>>;

export interface TimeSeriesLine extends ChartSeries {
  comparison?: boolean;
}

interface Props {
  data: readonly TimeSeriesPoint[];
  series: readonly TimeSeriesLine[];
  ariaLabel: string;
  legend?: boolean;
  baseline?: boolean;
  yDomain?: ["auto", "auto"];
  xAxis?: keyof typeof X_AXES;
  curve?: "monotone" | "stepAfter";
  formatLabel?: (label: string) => string;
}

export function TimeSeriesLineChart({
  data,
  series,
  ariaLabel,
  legend = false,
  baseline = false,
  yDomain,
  xAxis = "date",
  curve = "monotone",
  formatLabel,
}: Readonly<Props>) {
  const axisMoney = useAxisMoney();
  const formatDate = useIsoDate();
  const axis = X_AXES[xAxis];

  const first = parseIso(String(data[0]?.date ?? ""));
  const last = parseIso(String(data.at(-1)?.date ?? ""));
  const shortSpan = first && last ? last.getTime() - first.getTime() < SHORT_SPAN_MS : false;
  const formatTick = useAxisDateTick(shortSpan);

  const lines = series.toSorted(
    (a, b) => Number(Boolean(b.comparison)) - Number(Boolean(a.comparison)),
  );
  const swatchSeries = series.map((item) =>
    item.comparison ? { ...item, shape: "dashed" as const } : item,
  );

  const chart = (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 8, right: axis.marginRight, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            {...axisProps}
            dataKey={axis.dataKey}
            tickFormatter={xAxis === "date" ? (value) => formatTick(String(value)) : undefined}
            minTickGap={axis.minTickGap}
            interval={axis.interval}
            axisLine={baseline ? { stroke: "var(--rule)" } : false}
            tickMargin={8}
          />
          <YAxis
            {...axisProps}
            domain={yDomain}
            tickFormatter={(value) => axisMoney.format(Number(value))}
            tickCount={5}
            width={axis.yWidth}
          />
          <Tooltip
            cursor={chartCursor}
            content={<ChartTooltip series={swatchSeries} formatLabel={formatLabel ?? formatDate} />}
            isAnimationActive={false}
            offset={12}
          />
          {lines.map((item) => (
            <Line
              key={item.key}
              isAnimationActive={false}
              type={curve}
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={item === series[0] ? 2 : 1.5}
              strokeDasharray={item.comparison ? "4 3" : undefined}
              dot={false}
              activeDot={
                item.comparison
                  ? false
                  : { r: 4, fill: item.color, stroke: "var(--background)", strokeWidth: 2 }
              }
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  if (!legend) {
    return chart;
  }

  return (
    <div className="space-y-3">
      <ChartLegend series={swatchSeries} />
      {chart}
    </div>
  );
}
