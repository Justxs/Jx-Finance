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

function renderBars(items: readonly ChartSeries[]) {
  return items.map((item) => (
    <Bar
      key={item.key}
      isAnimationActive={false}
      stackId="total"
      maxBarSize={24}
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
    children: renderBars(series),
  },
} satisfies Meta<typeof BarChartFrame>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Stacked: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };
