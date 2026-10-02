import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getGoalsMockHandler } from "@/api/generated/goals/goals.msw";
import { withWidth } from "@/storybook/decorators";
import { goals, unavailableFundedGoal } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { DashboardCard } from "../dashboard-card/dashboard-card";
import { GoalsSnapshot } from "./goals-snapshot";

const meta = {
  title: "Features/Dashboard/GoalsSnapshot",
  component: GoalsSnapshot,
  decorators: [withWidth("column")],
} satisfies Meta<typeof GoalsSnapshot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const meters = await canvas.findAllByRole("meter");
    await expect(meters).toHaveLength(goals.length);
    await expect(meters[0]).toHaveAccessibleName(/^Atostogos Madeiroje visai šeimai, 59%/u);
    await expect(meters.at(-1)).toHaveAccessibleName(/^Naujas dviratis, 100%/u);
    await expect(canvas.getByText(/^(reached|pasiekta)$/iu)).toBeVisible();
  },
};

export const ProgressUnavailable: Story = {
  parameters: withHandlers(getGoalsMockHandler([unavailableFundedGoal])),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/^(progress unavailable|pažanga nepasiekiama)$/iu),
    ).toBeVisible();
    await expect(canvas.queryByRole("meter")).toBeNull();
  },
};

export const PastMonth: Story = {
  render: () => <DashboardCard card="goals" month="2026-01" />,
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/^(goals are shown on the current month\.|tikslai rodomi)/iu),
    ).toBeVisible();
  },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
