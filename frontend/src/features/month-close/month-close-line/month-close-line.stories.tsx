import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getMonthReviewMockHandler } from "@/api/generated/month-close/month-close.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { withWidth } from "@/storybook/decorators";
import { serverErrorProblem, settingsWith } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { MonthCloseLine } from "./month-close-line";

const meta = {
  title: "Features/MonthClose/MonthCloseLine",
  component: MonthCloseLine,
  args: { month: "2026-08" },
  decorators: [withWidth("full")],
} satisfies Meta<typeof MonthCloseLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OpenMonth: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("August 2026 has ended")).toBeVisible();
    await expect(canvas.getByText("7 lines still open.")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Review month" })).toHaveAttribute(
      "href",
      expect.stringContaining("/reports/month?month=2026-08"),
    );
  },
};

export const ClosedMonth: Story = {
  args: { month: "2026-06" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("June 2026 is closed")).toBeVisible();
    await expect(canvas.getByText(/^Closed on /)).toBeVisible();
  },
};

export const ChangedAfterClosing: Story = {
  args: { month: "2026-07" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("July 2026 changed after closing")).toBeVisible();
  },
};

export const FeatureOff: Story = {
  parameters: withHandlers(
    getSettingsMockHandler(settingsWith({ features: { monthClose: false } })),
  ),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link", { name: "Review month" })).toBeNull();
  },
};

export const FailsQuietly: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(pending)),
};
