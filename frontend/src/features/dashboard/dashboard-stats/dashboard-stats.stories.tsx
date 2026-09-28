import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getDashboardSummaryMockHandler } from "@/api/generated/dashboard/dashboard.msw";
import { withWidth } from "@/storybook/decorators";
import { dashboardSummary, FIXTURE_MONTH } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { DashboardStats } from "./dashboard-stats";

const meta = {
  title: "Features/Dashboard/DashboardStats",
  component: DashboardStats,
  args: { month: FIXTURE_MONTH },
  decorators: [withWidth("full")],
} satisfies Meta<typeof DashboardStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", { name: /of the month.s income kept|sutaupyta/i }),
    ).toBeVisible();
  },
};

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
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", { name: /spent more than came in|išleista daugiau/i }),
    ).toBeVisible();
  },
};

export const LargeAmounts: Story = {
  parameters: withHandlers(getDashboardSummaryMockHandler(largeSummary)),
};

export const EarlierMonth: Story = {
  args: { month: "2026-03" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/balance at month end|likutis mėnesio pabaigoje/i),
    ).toBeVisible();
  },
};
