import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { accounts, categories, tags } from "@/storybook/fixtures";
import { type Canvas, openedDialog } from "@/storybook/interactions";
import { TransactionsFiltersDialog } from "./transactions-filters-dialog";

function FiltersDialogHarness() {
  const filters = useTransactionFilters({ accounts, categories });
  return <TransactionsFiltersDialog filters={filters} tags={tags} />;
}

const meta = {
  title: "Features/Transactions/TransactionsFiltersDialog",
  component: FiltersDialogHarness,
  parameters: { route: "/transactions" },
} satisfies Meta<typeof FiltersDialogHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openFilters(canvas: Canvas) {
  await userEvent.click(await canvas.findByRole("button", { name: /^Filters/ }));
  return openedDialog();
}

export const Closed: Story = {};

export const ClosedWithActiveFilters: Story = {
  parameters: { route: "/transactions?type=expense&search=lidl" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("button", { name: /^Filters/ })).toHaveTextContent("· 2");
  },
};

export const Open: Story = {
  play: async ({ canvas }) => {
    await openFilters(canvas);
  },
};

export const OpenWithTagFilter: Story = {
  parameters: { route: `/transactions?tagIds=${tags[0]?.id ?? ""}` },
  play: async ({ canvas }) => {
    await openFilters(canvas);
  },
};

export const OpenWithActiveFilters: Story = {
  parameters: {
    route:
      "/transactions?type=expense&dateFrom=2026-09-01&dateTo=2026-09-30&sort=amount&direction=desc",
  },
  play: async ({ canvas }) => {
    const dialog = await openFilters(canvas);
    await expect(dialog).toHaveTextContent("Clear filters");
  },
};
