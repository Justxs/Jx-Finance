import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { TransactionResponse } from "@/api/generated/model";
import { getDebtsMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { getBulkCategorizeTransactionsMockHandler } from "@/api/generated/transactions/transactions.msw";
import {
  accounts,
  categories,
  debts,
  foreignCurrencyTransactions,
  linkedPaymentTransaction,
  longDescriptionTransaction,
  splitTransaction,
  tags,
  trackedMortgage,
  transactions,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { TransactionsTable } from "./transactions-table";
import { useTransactionColumnHeaders } from "./use-transaction-column-headers";
import { isSelectableTransaction, useTransactionColumns } from "./use-transaction-columns";

interface HarnessProps {
  data?: TransactionResponse[];
  isPlaceholder?: boolean;
  deletingId?: string | null;
  initialSelectedIds?: string[];
}

const NO_IDS: string[] = [];
const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const tagById = new Map(tags.map((tag) => [tag.id, tag]));

function TransactionsTableHarness({
  data = transactions.slice(0, 10),
  isPlaceholder = false,
  deletingId = null,
  initialSelectedIds = NO_IDS,
}: Readonly<HarnessProps>) {
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set(initialSelectedIds));
  const selectableIds = data.filter(isSelectableTransaction).map((item) => item.id);
  const columnHeaders = useTransactionColumnHeaders({ accounts, categories, tags });
  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    tagById,
    onEdit: (transaction) => toast.message(`Edit ${transaction.description ?? transaction.id}`),
    onDuplicate: (transaction) =>
      toast.message(`Duplicate ${transaction.description ?? transaction.id}`),
    onDelete: (id) => toast.message(`Delete ${id}`),
    deletingId,
  });

  return (
    <div className="p-6 lg:p-10">
      <TransactionsTable
        data={data}
        columns={columns}
        isPlaceholder={isPlaceholder}
        columnFilters={columnHeaders.byColumn}
        columnAriaSort={columnHeaders.ariaSortByColumn}
        filtered={columnHeaders.active}
        selection={{
          selectedIds,
          selectableIds,
          rowLabel: (row) => `${row.date} ${row.description ?? ""}`,
          onToggle: (id, selected) => {
            const next = new Set(selectedIds);
            if (selected) {
              next.add(id);
            } else {
              next.delete(id);
            }
            setSelectedIds(next);
          },
          onTogglePage: (selected) => setSelectedIds(new Set(selected ? selectableIds : [])),
        }}
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

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1 file attached")).toBeInTheDocument();
    await expect(canvas.getByText("2 files attached")).toBeInTheDocument();
  },
};

export const Empty: Story = { args: { data: [] } };

export const ForeignCurrency: Story = {
  args: { data: [...foreignCurrencyTransactions, ...transactions.slice(0, 3)] },
};

export const FilteredNoMatches: Story = {
  args: { data: [] },
  parameters: { route: "/transactions?type=expense&search=nothing" },
};

export const WithActiveFilters: Story = {
  args: { data: transactions.filter((item) => item.type === "expense").slice(0, 8) },
  parameters: {
    route:
      "/transactions?type=expense&dateFrom=2026-09-01&dateTo=2026-09-30&sort=amount&direction=desc",
  },
};

export const SomeSelected: Story = {
  args: { initialSelectedIds: transactions.slice(0, 3).map((item) => item.id) },
};

export const AllSelected: Story = {
  args: { initialSelectedIds: transactions.slice(0, 10).map((item) => item.id) },
};

export const Placeholder: Story = {
  args: { isPlaceholder: true },
};

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
  },
};

const recategorized = fn();
const expenseCategory = categories.find((category) => category.type === "expense");

export const CategoryChangedInline: Story = {
  args: { data: [uncategorisedTransaction] },
  parameters: withHandlers(
    getBulkCategorizeTransactionsMockHandler(async ({ request }) => {
      recategorized(await request.json());
      return { updated: 1 };
    }),
  ),
  play: async ({ canvas }) => {
    if (!expenseCategory) {
      throw new Error("the fixtures have no expense category");
    }
    await userEvent.click(canvas.getByRole("combobox", { name: /^Category for / }));
    await userEvent.type(await screen.findByLabelText("Search"), expenseCategory.name.slice(0, 3));
    await userEvent.click(await screen.findByRole("option", { name: expenseCategory.name }));
    await waitFor(() =>
      expect(recategorized).toHaveBeenCalledWith({
        transactionIds: [uncategorisedTransaction.id],
        categoryId: expenseCategory.id,
      }),
    );
  },
};

export const SplitRowsKeepTheirTag: Story = {
  args: { data: [splitTransaction] },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("Split")).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: /^Category for / })).toBeNull();
  },
};

export const PaysADebt: Story = {
  args: { data: [linkedPaymentTransaction, ...transactions.slice(0, 4)] },
  parameters: withHandlers(getDebtsMockHandler([trackedMortgage, ...debts.slice(1)])),
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("link", { name: `Pays debt: ${trackedMortgage.name}` }),
    ).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", {
        name: `Actions: ${linkedPaymentTransaction.description ?? ""}`,
      }),
    );
    await expect(await screen.findByRole("menuitem", { name: "Unlink from debt" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(
      canvas.getByRole("button", { name: `Actions: ${transactions[0]?.description ?? ""}` }),
    );
    await expect(await screen.findByRole("menuitem", { name: "Link to debt" })).toBeVisible();
  },
};
