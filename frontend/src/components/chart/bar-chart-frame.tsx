import type { ReactNode } from "react";
import { CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAxisMoney } from "@/hooks/use-formatters";
import { ChartLegend } from "./chart-legend";
import { axisProps, chartCursor } from "./chart-theme";
import { type ChartSeries, ChartTooltip } from "./chart-tooltip";

interface Props {
  data: readonly unknown[];
  series: readonly ChartSeries[];
  ariaLabel: string;
  height: number;
  barCategoryGap: string;
  barGap?: number;
  summaryKey?: string;
  formatLabel?: (label: string) => string;
  children: ReactNode;
}

export function BarChartFrame({
  data,
  series,
  ariaLabel,
  height,
  barCategoryGap,
  barGap,
  summaryKey,
  formatLabel,
  children,
}: Readonly<Props>) {
  const axisMoney = useAxisMoney();

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            accessibilityLayer={false}
            data={data}
            margin={{ top: 8, right: 12, bottom: 0, left: 0 }}
            barCategoryGap={barCategoryGap}
            barGap={barGap}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              {...axisProps}
              tickMargin={8}
              minTickGap={16}
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
                <ChartTooltip series={series} summaryKey={summaryKey} formatLabel={formatLabel} />
              }
              isAnimationActive={false}
              offset={12}
            />
            {children}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
