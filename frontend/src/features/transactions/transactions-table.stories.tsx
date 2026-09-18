import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import type { TransactionResponse } from "@/api/generated/model";
import {
  accounts,
  categories,
  longDescriptionTransaction,
  splitTransaction,
  transactions,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { TransactionsTable } from "./transactions-table";
import { useTransactionColumnHeaders } from "./use-transaction-column-headers";
import { useTransactionColumns } from "./use-transaction-columns";

interface HarnessProps {
  data?: TransactionResponse[];
  isPlaceholder?: boolean;
  pageCount?: number;
  deletingId?: string | null;
}

const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
const categoryById = new Map(categories.map((category) => [category.id, category]));

function TransactionsTableHarness({
  data = transactions.slice(0, 10),
  isPlaceholder = false,
  pageCount = 4,
  deletingId = null,
}: Readonly<HarnessProps>) {
  const [page, setPage] = useState(1);
  const columnHeaders = useTransactionColumnHeaders({ accounts, categories });
  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    onEdit: (transaction) => toast.message(`Edit ${transaction.description ?? transaction.id}`),
    onDelete: (id) => toast.message(`Delete ${id}`),
    deletingId,
  });

  return (
    <div className="mx-auto max-w-6xl p-6">
      <TransactionsTable
        data={data}
        columns={columns}
        isPlaceholder={isPlaceholder}
        columnFilters={columnHeaders.byColumn}
        filtered={columnHeaders.active}
        page={page}
        pageCount={pageCount}
        onPageChange={setPage}
      />
    </div>
  );
}

const meta = {
  title: "Features/Transactions/TransactionsTable",
  component: TransactionsTableHarness,
  parameters: { layout: "fullscreen", route: "/transactions" },
} satisfies Meta<typeof TransactionsTableHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { data: [], pageCount: 1 } };

export const FilteredNoMatches: Story = {
  args: { data: [], pageCount: 1 },
  parameters: { route: "/transactions?type=expense&search=nothing" },
};

export const WithActiveFilters: Story = {
  args: { data: transactions.filter((item) => item.type === "expense").slice(0, 8) },
  parameters: {
    route:
      "/transactions?type=expense&dateFrom=2026-09-01&dateTo=2026-09-30&sort=amount&direction=desc",
  },
};

export const SinglePage: Story = { args: { pageCount: 1 } };

export const Placeholder: Story = { args: { isPlaceholder: true } };

export const Deleting: Story = { args: { deletingId: transactions[1]?.id ?? null } };

export const OptimisticRow: Story = {
  args: {
    data: transactions
      .slice(0, 6)
      .map((item, index) =>
        index === 0 ? { ...item, id: "optimistic-1", description: "Saving in progress" } : item,
      ),
  },
};

export const SpecialRows: Story = {
  args: {
    data: [splitTransaction, longDescriptionTransaction, uncategorisedTransaction],
    pageCount: 1,
  },
};
