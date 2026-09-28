import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { accounts, categories, ids, tags } from "@/storybook/fixtures";
import { ActiveFilters } from "./active-filters";

const meta = {
  title: "Features/Transactions/ActiveFilters",
  component: ActiveFilters,
  args: { accounts, categories, tags },
  parameters: {
    route: `/transactions?dateFrom=2026-09-01&dateTo=2026-09-30&accountId=${ids.accounts.checking}&uncategorized=true`,
  },
} satisfies Meta<typeof ActiveFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const MonthAccountAndUncategorized: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("September 2026")).toBeVisible();
    await expect(canvas.getByText("Swedbank einamoji")).toBeVisible();
    await expect(canvas.getByText("Uncategorized")).toBeVisible();
  },
};

export const DateRangeSince: Story = {
  parameters: { route: "/transactions?dateFrom=2026-09-14" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^From /)).toBeVisible();
  },
};

export const NoFilters: Story = { parameters: { route: "/transactions" } };

export const ClearingAll: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Clear filters" }));
    await waitFor(() =>
      expect(canvas.queryByRole("list", { name: "Active filters" })).not.toBeInTheDocument(),
    );
  },
};
