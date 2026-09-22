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
  layout?: "horizontal" | "vertical";
  summaryKey?: string;
  formatCategory?: (value: string) => string;
  children: ReactNode;
}

export function BarChartFrame({
  data,
  series,
  ariaLabel,
  height,
  barCategoryGap,
  barGap,
  layout = "horizontal",
  summaryKey,
  formatCategory,
  children,
}: Readonly<Props>) {
  const axisMoney = useAxisMoney();
  const vertical = layout === "vertical";

  function formatMoney(value: unknown) {
    return axisMoney.format(Number(value));
  }

  const categoryTick = formatCategory
    ? (value: unknown) => formatCategory(String(value))
    : undefined;

  return (
    <div className="space-y-3">
      <ChartLegend series={series} />
      <div role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            accessibilityLayer={false}
            layout={layout}
            data={data}
            margin={{ top: vertical ? 0 : 8, right: 12, bottom: 0, left: 0 }}
            barCategoryGap={barCategoryGap}
            barGap={barGap}
          >
            <CartesianGrid vertical={vertical} horizontal={!vertical} stroke="var(--border)" />
            {vertical ? (
              <XAxis type="number" tickFormatter={formatMoney} {...axisProps} tickCount={5} />
            ) : (
              <XAxis
                dataKey="label"
                tickFormatter={categoryTick}
                {...axisProps}
                tickMargin={8}
                minTickGap={16}
                interval="preserveStartEnd"
              />
            )}
            {vertical ? (
              <YAxis
                type="category"
                dataKey="label"
                tickFormatter={categoryTick}
                {...axisProps}
                width={132}
              />
            ) : (
              <YAxis tickFormatter={formatMoney} {...axisProps} tickCount={5} width={56} />
            )}
            <Tooltip
              cursor={vertical ? { fill: "var(--muted)", fillOpacity: 0.5 } : chartCursor}
              content={<ChartTooltip series={series} summaryKey={summaryKey} />}
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
