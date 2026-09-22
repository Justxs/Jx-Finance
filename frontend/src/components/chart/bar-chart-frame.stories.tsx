import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bar } from "recharts";
import { withWidth } from "@/storybook/decorators";
import { BarChartFrame } from "./bar-chart-frame";
import { CHART_COLOR_NEGATIVE, CHART_COLOR_POSITIVE, CHART_COLOR_PRIMARY } from "./chart-theme";
import type { ChartSeries } from "./chart-tooltip";

const series: ChartSeries[] = [
  { key: "interest", label: "Interest", color: CHART_COLOR_NEGATIVE },
  { key: "principal", label: "Principal", color: CHART_COLOR_PRIMARY },
  { key: "extra", label: "Overpayment", color: CHART_COLOR_POSITIVE },
];

const years = [
  { label: "2025", interest: 4210.4, principal: 6120.8, extra: 0 },
  { label: "2026", interest: 3980.15, principal: 6351.05, extra: 2000 },
  { label: "2027", interest: 3602.9, principal: 6728.3, extra: 2000 },
  { label: "2028", interest: 3190.55, principal: 7140.65, extra: 0 },
];

const usageSeries: ChartSeries[] = [
  { key: "limit", label: "Limit", color: "var(--input)" },
  { key: "spent", label: "Spent", color: CHART_COLOR_PRIMARY },
];

const categories = [
  { label: "Groceries", limit: 600, spent: 452.3 },
  { label: "Restaurants and takeaway", limit: 250, spent: 301.9 },
  { label: "Transport", limit: 180, spent: 96.4 },
];

function renderBars(items: readonly ChartSeries[], stacked: boolean) {
  return items.map((item) => (
    <Bar
      key={item.key}
      isAnimationActive={false}
      stackId={stacked ? "total" : undefined}
      maxBarSize={stacked ? 24 : 10}
      dataKey={item.key}
      fill={item.color}
    />
  ));
}

const meta = {
  title: "Components/Chart/BarChartFrame",
  component: BarChartFrame,
  decorators: [withWidth("wide")],
  args: {
    data: years,
    series,
    ariaLabel: "Payments per year",
    height: 240,
    barCategoryGap: "20%",
    children: renderBars(series, true),
  },
} satisfies Meta<typeof BarChartFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stacked: Story = {};

export const Vertical: Story = {
  args: {
    data: categories,
    series: usageSeries,
    ariaLabel: "Budget usage",
    height: categories.length * 44 + 32,
    layout: "vertical",
    barCategoryGap: "30%",
    barGap: 2,
    formatCategory: (value) => (value.length > 18 ? `${value.slice(0, 17)}…` : value),
    children: renderBars(usageSeries, false),
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
