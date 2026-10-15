export const CHART_COLOR_PRIMARY = "var(--chart-1)";
export const CHART_COLOR_POSITIVE = "var(--chart-2)";
export const CHART_COLOR_NEGATIVE = "var(--chart-3)";
export const CHART_COLOR_MUTED = "var(--muted-foreground)";

export const chartTheme = {
  foreground: "var(--foreground)",
  muted: CHART_COLOR_MUTED,
  grid: "var(--border)",
} as const;

export const chartCursor = {
  stroke: CHART_COLOR_MUTED,
  strokeOpacity: 1,
  strokeWidth: 1,
  strokeDasharray: "3 3",
} as const;

export const axisTicks = {
  line: false,
  tickLabels: { fontSize: 12, opacity: 1 },
} as const;
