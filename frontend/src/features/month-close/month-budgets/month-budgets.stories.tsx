import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { openMonthReview } from "@/storybook/fixtures";
import { MonthBudgets } from "./month-budgets";

const meta = {
  title: "Features/MonthClose/MonthBudgets",
  component: MonthBudgets,
  parameters: { layout: "padded" },
  args: { budgets: openMonthReview.budgets ?? [] },
} satisfies Meta<typeof MonthBudgets>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/against today's limits/)).toBeVisible();
    await expect(canvas.getAllByRole("meter").length).toBeGreaterThan(0);
  },
};

export const Empty: Story = {
  args: { budgets: [] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("There are no monthly budgets.")).toBeVisible();
  },
};
