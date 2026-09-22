export const CHART_COLOR_PRIMARY = "var(--chart-1)";
export const CHART_COLOR_POSITIVE = "var(--chart-2)";
export const CHART_COLOR_NEGATIVE = "var(--chart-3)";

export const CHART_COLOR_INCOME = CHART_COLOR_POSITIVE;
export const CHART_COLOR_EXPENSE = CHART_COLOR_NEGATIVE;

const axisTick = {
  fill: "var(--muted-foreground)",
  fontSize: 12,
  style: { fontVariantNumeric: "tabular-nums" },
} as const;

export const chartCursor = {
  stroke: "var(--muted-foreground)",
  strokeWidth: 1,
  strokeDasharray: "3 3",
} as const;

export const axisProps = {
  tick: axisTick,
  axisLine: false,
  tickLine: false,
} as const;
