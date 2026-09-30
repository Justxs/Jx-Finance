export const CHART_COLOR_PRIMARY = "var(--chart-1)";
export const CHART_COLOR_POSITIVE = "var(--chart-2)";
export const CHART_COLOR_NEGATIVE = "var(--chart-3)";
export const CHART_COLOR_MUTED = "var(--muted-foreground)";

const axisTick = {
  fill: CHART_COLOR_MUTED,
  fontSize: 12,
  style: { fontVariantNumeric: "tabular-nums" },
} as const;

export const chartCursor = {
  stroke: CHART_COLOR_MUTED,
  strokeWidth: 1,
  strokeDasharray: "3 3",
} as const;

export const axisProps = {
  tick: axisTick,
  axisLine: false,
  tickLine: false,
} as const;
