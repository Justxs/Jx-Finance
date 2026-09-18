import type { Meta, StoryObj } from "@storybook/react-vite";
import { reportSummaryMonth, reportSummaryYear } from "@/storybook/fixtures";
import { ReportTrendChart } from "./report-trend-chart";

const meta = {
  title: "Features/Reports/ReportTrendChart",
  component: ReportTrendChart,
  parameters: { layout: "padded", route: "/reports" },
  args: { items: reportSummaryMonth.trend ?? [], bucket: "day" },
  render: (args) => (
    <section className="card p-6">
      <h2 className="mb-4 font-semibold">Income and expense trend</h2>
      <ReportTrendChart {...args} />
    </section>
  ),
} satisfies Meta<typeof ReportTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DayBuckets: Story = {};

export const MonthBuckets: Story = {
  args: { items: reportSummaryYear.trend ?? [], bucket: "month" },
};

export const Empty: Story = { args: { items: [] } };

export const SinglePoint: Story = {
  args: { items: [{ bucketStart: "2026-09-01", income: "2450.00", expense: "1310.42" }] },
};

export const ExpenseOnly: Story = {
  args: {
    items: (reportSummaryMonth.trend ?? []).map((item) => ({ ...item, income: "0.00" })),
  },
};

export const LargeAmounts: Story = {
  args: {
    bucket: "month",
    items: (reportSummaryYear.trend ?? []).map((item) => ({
      ...item,
      income: String(Number(item.income ?? 0) * 1000),
      expense: String(Number(item.expense ?? 0) * 1000),
    })),
  },
};

export const Narrow: Story = {
  args: { items: reportSummaryYear.trend ?? [], bucket: "month" },
  render: (args) => (
    <section className="card w-80 p-4">
      <ReportTrendChart {...args} />
    </section>
  ),
};
