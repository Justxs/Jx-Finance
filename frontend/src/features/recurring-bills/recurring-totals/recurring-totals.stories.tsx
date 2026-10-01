import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import {
  emptyRecurringTotals,
  recurringTotals,
  settledRecurringTotals,
} from "@/storybook/fixtures";
import { RecurringTotals } from "./recurring-totals";

const meta = {
  title: "Features/RecurringBills/RecurringTotals",
  component: RecurringTotals,
  parameters: { layout: "padded" },
  args: { totals: recurringTotals },
} satisfies Meta<typeof RecurringTotals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Costs per month")).toBeVisible();
    await expect(canvas.getByText("€719.58")).toBeVisible();
    await expect(canvas.getByText("€8,634.96")).toBeVisible();
    await expect(canvas.getByText("+€26,160.00")).toBeVisible();
    await expect(canvas.getByText("Partly estimated · 1 entry without an amount")).toBeVisible();
  },
};

export const Settled: Story = {
  args: { totals: settledRecurringTotals },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Partly estimated/u)).toBeNull();
  },
};

export const Empty: Story = { args: { totals: emptyRecurringTotals } };

export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};
