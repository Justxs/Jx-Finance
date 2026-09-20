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
