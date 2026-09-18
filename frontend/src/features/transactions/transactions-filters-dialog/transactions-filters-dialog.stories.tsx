import type { Meta, StoryObj } from "@storybook/react-vite";
import { accounts, categories } from "@/storybook/fixtures";
import { TransactionsFiltersDialog } from "./transactions-filters-dialog";

const meta = {
  title: "Features/Transactions/TransactionsFiltersDialog",
  component: TransactionsFiltersDialog,
  args: { accounts, categories },
  parameters: { route: "/transactions" },
} satisfies Meta<typeof TransactionsFiltersDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const ClosedWithActiveFilters: Story = {
  parameters: { route: "/transactions?type=expense&search=lidl" },
};

export const Open: Story = { args: { defaultOpen: true } };

export const OpenWithActiveFilters: Story = {
  args: { defaultOpen: true },
  parameters: {
    route:
      "/transactions?type=expense&dateFrom=2026-09-01&dateTo=2026-09-30&sort=amount&direction=desc",
  },
};
