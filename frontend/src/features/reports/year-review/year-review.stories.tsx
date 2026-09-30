import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { reportSummaryYear } from "@/storybook/fixtures";
import { YearReview } from "./year-review";

const meta = {
  title: "Features/Reports/YearReview",
  component: YearReview,
  args: {
    trend: reportSummaryYear.trend,
    expenseByCategory: reportSummaryYear.expenseByCategory,
    compared: false,
    onCompare: fn(),
  },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof YearReview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NotCompared: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByRole("table", { name: "Month by month" })).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: "Compare with the year before" }));
    await expect(args.onCompare).toHaveBeenCalledTimes(1);
  },
};

export const Compared: Story = {
  args: {
    compared: true,
    expenseByCategory: reportSummaryYear.expenseByCategory.map((item, index) => ({
      ...item,
      comparisonAmount: (Number(item.amount) * (index % 2 === 0 ? 0.8 : 1.3)).toFixed(2),
    })),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Biggest changes from the year before")).toBeVisible();
    await expect(canvas.getAllByText(/, was /u).length).toBeGreaterThan(0);
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
