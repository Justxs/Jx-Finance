import type { Meta, StoryObj } from "@storybook/react-vite";
import { getDashboardSummaryMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { dashboardSummary } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { DashboardStats } from "./dashboard-stats";

const meta = {
  title: "Features/Dashboard/DashboardStats",
  component: DashboardStats,
  render: () => (
    <div className="w-[min(64rem,90vw)]">
      <QueryBoundary fallback={<Skeleton className="h-28 w-full" />}>
        <DashboardStats />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof DashboardStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function overspentSummary() {
  return {
    ...dashboardSummary,
    totalBalance: "-1284.55",
    monthIncome: "1200.00",
    monthExpense: "4875.90",
  };
}

function largeSummary() {
  return {
    ...dashboardSummary,
    totalBalance: "12345678901.23",
    monthIncome: "9876543.21",
    monthExpense: "8765432.10",
  };
}

export const Overspent: Story = {
  parameters: withHandlers(getDashboardSummaryMockHandler(overspentSummary)),
};

export const LargeAmounts: Story = {
  parameters: withHandlers(getDashboardSummaryMockHandler(largeSummary)),
};
