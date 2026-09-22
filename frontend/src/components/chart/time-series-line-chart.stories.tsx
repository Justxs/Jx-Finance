import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { CHART_COLOR_POSITIVE, CHART_COLOR_PRIMARY } from "./chart-theme";
import { type TimeSeriesLine, TimeSeriesLineChart } from "./time-series-line-chart";

const valueSeries: TimeSeriesLine[] = [
  { key: "value", label: "Market value", color: CHART_COLOR_PRIMARY, shape: "line" },
  { key: "cost", label: "Cost basis", color: CHART_COLOR_POSITIVE, shape: "line" },
];

const paceSeries: TimeSeriesLine[] = [
  { key: "current", label: "This month", color: CHART_COLOR_PRIMARY, shape: "line" },
  {
    key: "previous",
    label: "Last month",
    color: "var(--muted-foreground)",
    shape: "line",
    comparison: true,
  },
];

const months = Array.from({ length: 12 }, (_, index) => ({
  date: `2026-${String(index + 1).padStart(2, "0")}-01`,
  value: 42_000 + index * 1350 + (index % 3) * 900,
  cost: 40_000 + index * 1000,
}));

const days = Array.from({ length: 30 }, (_, index) => ({
  day: index + 1,
  current: index < 21 ? Math.round(index * 48.5 + (index % 4) * 30) : undefined,
  previous: Math.round(index * 52 + (index % 5) * 25),
}));

const meta = {
  title: "Components/Chart/TimeSeriesLineChart",
  component: TimeSeriesLineChart,
  decorators: [withWidth("wide")],
  args: {
    data: months,
    series: valueSeries,
    ariaLabel: "Portfolio value",
    legend: true,
    yDomain: ["auto", "auto"],
  },
} satisfies Meta<typeof TimeSeriesLineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dates: Story = {};

export const WithBaseline: Story = {
  args: { series: valueSeries.slice(0, 1), legend: false, baseline: true },
};

export const DayStepsWithComparison: Story = {
  args: {
    data: days,
    series: paceSeries,
    ariaLabel: "Spending pace",
    yDomain: undefined,
    xAxis: "day",
    curve: "stepAfter",
    formatLabel: (day) => `Day ${day}`,
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
