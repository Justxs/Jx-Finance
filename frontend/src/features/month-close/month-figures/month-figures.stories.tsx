import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { emptyMonthReview, openMonthReview } from "@/storybook/fixtures";
import { MonthFigures } from "./month-figures";

const meta = {
  title: "Features/MonthClose/MonthFigures",
  component: MonthFigures,
  parameters: { layout: "padded", route: "/close" },
  args: { month: "2026-08", figures: openMonthReview.figures },
} satisfies Meta<typeof MonthFigures>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgainstThePreviousMonth: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Compared with/)).toBeVisible();
    await expect(canvas.getByText("Savings rate")).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Categories that moved most" })).toBeVisible();
  },
};

export const NoIncome: Story = {
  args: { figures: emptyMonthReview.figures },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No income this month")).toBeVisible();
    await expect(canvas.getByText("No category changed against the previous month.")).toBeVisible();
  },
};
