import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getCashFlowForecastMockHandler } from "@/api/generated/accounts/accounts.msw";
import { withWidth } from "@/storybook/decorators";
import { calmCashFlowForecast, usualSpendingCashFlowForecast } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { DashboardCard } from "../dashboard-card/dashboard-card";
import { CashFlowCard } from "./cash-flow-card";

const meta = {
  title: "Features/Dashboard/CashFlowCard",
  component: CashFlowCard,
  decorators: [withWidth("column")],
} satisfies Meta<typeof CashFlowCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AtRisk: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Below zero on Oct 1")).toBeVisible();
    await expect(canvas.getByText(/^Lowest .*361.19 on Oct 1$/u)).toBeVisible();
  },
};

export const WithUsualSpending: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(usualSpendingCashFlowForecast)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("May go below zero around Oct 1")).toBeVisible();
  },
};

export const Calm: Story = {
  parameters: withHandlers(getCashFlowForecastMockHandler(calmCashFlowForecast)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Swedbank einamoji")).toBeVisible();
    await expect(canvas.queryByText(/below zero/u)).toBeNull();
  },
};

export const PastMonth: Story = {
  render: () => <DashboardCard card="cashFlow" month="2026-01" />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("The cash-flow forecast is shown on the current month."),
    ).toBeVisible();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
