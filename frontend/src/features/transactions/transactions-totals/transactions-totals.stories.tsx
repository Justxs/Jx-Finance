import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getTransactionsSummaryMockHandler } from "@/api/generated/transactions/transactions.msw";
import { withWidth } from "@/storybook/decorators";
import { emptyHandlers, errorHandlers, pending, withHandlers } from "@/storybook/handlers";
import { TransactionsTotals, TransactionsTotalsLine } from "./transactions-totals";

const meta = {
  title: "Features/Transactions/TransactionsTotals",
  component: TransactionsTotals,
  args: { params: {}, stale: false },
  parameters: { route: "/transactions" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof TransactionsTotals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: { params: { type: "expense", dateFrom: "2026-09-01", dateTo: "2026-09-07" } },
};

export const Zero: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Stale: Story = { args: { stale: true } };

export const Loading: Story = {
  parameters: withHandlers(getTransactionsSummaryMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: { msw: { handlers: errorHandlers } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "Totals for the current filters could not be loaded.",
    );
  },
};

export const RefundsOutweighSpending: Story = {
  render: () => <TransactionsTotalsLine count={2} totalIncome="0" totalExpense="-12.50" />,
  play: async ({ canvas }) => {
    await expect(canvas.getByText("+€12.50")).toBeVisible();
  },
};

export const LargeAmountsNarrow: Story = {
  render: () => (
    <div className="w-72">
      <TransactionsTotalsLine count={1284} totalIncome="148250.40" totalExpense="131904.17" />
    </div>
  ),
};
