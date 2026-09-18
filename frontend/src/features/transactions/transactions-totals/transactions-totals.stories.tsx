import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { emptyHandlers, errorHandlers, handlers } from "@/storybook/handlers";
import { TransactionsTotals, TransactionsTotalsLine } from "./transactions-totals";

const meta = {
  title: "Features/Transactions/TransactionsTotals",
  component: TransactionsTotals,
  args: { params: {}, stale: false },
  parameters: { route: "/transactions" },
  render: (args) => (
    <div className="w-[min(48rem,90vw)]">
      <TransactionsTotals {...args} />
    </div>
  ),
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
  parameters: {
    msw: {
      handlers: [
        http.get("*/api/transactions/summary", async () => {
          await delay("infinite");
          return new HttpResponse(null, { status: 204 });
        }),
        ...handlers,
      ],
    },
  },
};

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const LargeAmountsNarrow: Story = {
  render: () => (
    <div className="w-72">
      <TransactionsTotalsLine count={1284} totalIncome="148250.40" totalExpense="131904.17" />
    </div>
  ),
};
