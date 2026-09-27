import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { openMonthReview } from "@/storybook/fixtures";
import { MonthNetWorth } from "./month-net-worth";

const meta = {
  title: "Features/MonthClose/MonthNetWorth",
  component: MonthNetWorth,
  parameters: { layout: "padded" },
  args: { start: openMonthReview.netWorthStart, end: openMonthReview.netWorthEnd },
} satisfies Meta<typeof MonthNetWorth>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Change: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Snapshots from/)).toBeVisible();
  },
};

export const NoHistory: Story = {
  args: { start: null, end: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/not enough net worth snapshots/)).toBeVisible();
  },
};
