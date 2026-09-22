import type { Meta, StoryObj } from "@storybook/react-vite";
import { getMonthlyTrendMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Card } from "@/components/ui/card/card";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { monthlyTrendItems } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { MonthlyTrendChart } from "./monthly-trend-chart";

const meta = {
  title: "Features/Dashboard/MonthlyTrendChart",
  component: MonthlyTrendChart,
  render: () => (
    <Card className="w-[min(40rem,90vw)] p-6">
      <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
        <MonthlyTrendChart />
      </QueryBoundary>
    </Card>
  ),
} satisfies Meta<typeof MonthlyTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function singleMonthTrend() {
  return { items: monthlyTrendItems.slice(-1) };
}

function expenseOnlyTrend() {
  return {
    items: monthlyTrendItems.map((item) => ({ ...item, income: "0.00" })),
  };
}

export const SingleMonth: Story = {
  parameters: withHandlers(getMonthlyTrendMockHandler(singleMonthTrend)),
};

export const ExpenseOnly: Story = {
  parameters: withHandlers(getMonthlyTrendMockHandler(expenseOnlyTrend)),
};
