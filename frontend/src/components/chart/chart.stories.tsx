import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { ChartLegend } from "./chart-legend";
import { type ChartSeries, ChartTooltip } from "./chart-tooltip";
import { IncomeExpenseChart } from "./income-expense-chart";

const meta = {
  title: "Components/Chart",
  component: IncomeExpenseChart,
  decorators: [withWidth("panel")],
} satisfies Meta<typeof IncomeExpenseChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const months = [
  { label: "Apr 2026", income: 5010, expense: 3120.45 },
  { label: "May 2026", income: 5010, expense: 2890.1 },
  { label: "Jun 2026", income: 6240, expense: 3954.72 },
  { label: "Jul 2026", income: 5010, expense: 4420.3 },
  { label: "Aug 2026", income: 5100, expense: 3300.85 },
  { label: "Sep 2026", income: 5410, expense: 1438.41 },
];

const incomeByDay = new Map([
  [9, 2850],
  [24, 2140],
]);

const series: ChartSeries[] = [
  { key: "income", label: "Income", color: "var(--chart-2)", sign: "+", tone: "text-income" },
  { key: "expense", label: "Expenses", color: "var(--chart-3)", sign: "−" },
  { key: "net", label: "Net", color: "var(--foreground)", sign: "auto", shape: "line" },
];

export const SixMonths: Story = { args: { data: months } };

export const Dark: Story = { args: { data: months }, globals: { theme: "dark" } };

export const NegativeNet: Story = {
  args: {
    data: months.map((point, index) => (index === 3 ? { ...point, expense: 7350.5 } : point)),
  },
};

export const DailyBuckets: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, day) => ({
      label: `Sep ${day + 1}`,
      income: incomeByDay.get(day) ?? 0,
      expense: ((day * 37) % 11) * 14.35,
    })),
  },
};

export const ComparedWithAnEarlierPeriod: Story = {
  args: {
    data: months.map((point, index) => ({
      ...point,
      comparisonIncome: point.income * (index % 2 === 0 ? 0.88 : 1.07),
      comparisonExpense: point.expense * (index % 3 === 0 ? 1.24 : 0.81),
    })),
  },
};

export const SinglePoint: Story = { args: { data: months.slice(0, 1) } };

export const Empty: Story = { args: { data: [] } };

export const LargeAmounts: Story = {
  args: {
    data: months.map((point) => ({
      ...point,
      income: point.income * 1800,
      expense: point.expense * 1750,
    })),
  },
};

export const Lithuanian: Story = { args: { data: months }, globals: { locale: "lt" } };

export const TooltipOnly: Story = {
  args: { data: months },
  render: () => (
    <ChartTooltip
      active
      label="Jun 2026"
      series={series}
      summaryKey="net"
      payload={[
        { dataKey: "income", value: 6240 },
        { dataKey: "expense", value: 3954.72 },
        { dataKey: "net", value: 2285.28 },
      ]}
    />
  ),
};

export const LegendOnly: Story = {
  args: { data: months },
  render: () => <ChartLegend series={series} />,
};
