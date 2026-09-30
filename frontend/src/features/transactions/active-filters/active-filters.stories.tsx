import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { accounts, categories, ids, tags } from "@/storybook/fixtures";
import { ActiveFilters } from "./active-filters";

function ActiveFiltersHarness() {
  const filters = useTransactionFilters({ accounts, categories });
  return <ActiveFilters filters={filters} tags={tags} />;
}

const meta = {
  title: "Features/Transactions/ActiveFilters",
  component: ActiveFiltersHarness,
  parameters: {
    route: `/transactions?dateFrom=2026-09-01&dateTo=2026-09-30&accountId=${ids.accounts.checking}&uncategorized=true`,
  },
} satisfies Meta<typeof ActiveFiltersHarness>;

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

export const PayeeFromTheReport: Story = {
  parameters: { route: "/transactions?payee=maxima%20lt%20uab&type=expense" },
  play: async ({ canvas }) => {
    const chip = await canvas.findByRole("button", { name: "Remove filter Payee: maxima lt uab" });
    await userEvent.click(chip);
    await waitFor(() => expect(chip).not.toBeInTheDocument());
    await expect(canvas.getByText("Expense")).toBeVisible();
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
