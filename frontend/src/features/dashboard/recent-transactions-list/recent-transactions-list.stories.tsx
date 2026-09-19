import type { Meta, StoryObj } from "@storybook/react-vite";
import { getTransactionsMockHandler } from "@/api/generated/transactions/transactions.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import {
  longDescriptionTransaction,
  splitTransaction,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { RecentTransactionsList } from "./recent-transactions-list";

const meta = {
  title: "Features/Dashboard/RecentTransactionsList",
  component: RecentTransactionsList,
  render: () => (
    <div className="w-[min(48rem,90vw)]">
      <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
        <RecentTransactionsList />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof RecentTransactionsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

function specialTransactions() {
  const items = [longDescriptionTransaction, splitTransaction, uncategorisedTransaction];
  return { items, page: 1, pageSize: 6, total: items.length };
}

export const LongAndSpecialRows: Story = {
  parameters: {
    msw: { handlers: [getTransactionsMockHandler(specialTransactions), ...handlers] },
  },
};
