import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { emptyMonthReview, openMonthReview } from "@/storybook/fixtures";
import { MonthFigures, MonthMovers } from "./month-figures";

const meta = {
  title: "Features/MonthClose/MonthFigures",
  component: MonthFigures,
  parameters: { layout: "padded", route: "/close" },
  args: {
    figures: openMonthReview.figures,
    netWorthStart: openMonthReview.netWorthStart,
    netWorthEnd: openMonthReview.netWorthEnd,
  },
} satisfies Meta<typeof MonthFigures>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AgainstThePreviousMonth: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/Compared with/)).toBeVisible();
    await expect(canvas.getByText("Savings rate")).toBeVisible();
    await expect(canvas.getByText("Net worth change")).toBeVisible();
  },
};

export const NoIncomeAndNoNetWorthHistory: Story = {
  args: { figures: emptyMonthReview.figures, netWorthStart: null, netWorthEnd: null },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No income this month")).toBeVisible();
    await expect(canvas.queryByText("Net worth change")).toBeNull();
  },
};

export const Movers: Story = {
  render: () => <MonthMovers month="2026-08" figures={openMonthReview.figures} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "Categories that moved most" })).toBeVisible();
  },
};

export const NoMovers: Story = {
  render: () => <MonthMovers month="2026-08" figures={emptyMonthReview.figures} />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("No category changed against the previous month.")).toBeVisible();
  },
};
