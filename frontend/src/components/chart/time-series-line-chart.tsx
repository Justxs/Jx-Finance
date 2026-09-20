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

interface TimeSeriesPoint {
  date: string;
  [key: string]: string | number;
}

interface Props {
  data: readonly TimeSeriesPoint[];
  series: ChartSeries[];
  ariaLabel: string;
  legend?: boolean;
  baseline?: boolean;
  yDomain?: ["auto", "auto"];
}

export function TimeSeriesLineChart({
  data,
  series,
  ariaLabel,
  legend = false,
  baseline = false,
  yDomain,
}: Readonly<Props>) {
  const axisMoney = useAxisMoney();
  const formatDate = useIsoDate();

  const first = parseIso(data[0]?.date ?? "");
  const last = parseIso(data.at(-1)?.date ?? "");
  const shortSpan = first && last ? last.getTime() - first.getTime() < SHORT_SPAN_MS : false;
  const formatTick = useAxisDateTick(shortSpan);

  const chart = (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart
          accessibilityLayer={false}
          data={data}
          margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            {...axisProps}
            dataKey="date"
            tickFormatter={(value) => formatTick(String(value))}
            minTickGap={48}
            axisLine={baseline ? { stroke: "var(--rule)" } : false}
            tickMargin={8}
          />
          <YAxis
            {...axisProps}
            domain={yDomain}
            tickFormatter={(value) => axisMoney.format(Number(value))}
            tickCount={5}
            width={60}
          />
          <Tooltip
            cursor={chartCursor}
            content={<ChartTooltip series={series} formatLabel={formatDate} />}
            isAnimationActive={false}
            offset={12}
          />
          {series.map((item, index) => (
            <Line
              key={item.key}
              isAnimationActive={false}
              type="monotone"
              dataKey={item.key}
              stroke={item.color}
              strokeWidth={index === 0 ? 2 : 1.5}
              dot={false}
              activeDot={{ r: 4, fill: item.color, stroke: "var(--background)", strokeWidth: 2 }}
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
      <ChartLegend series={series} />
      {chart}
    </div>
  );
}
