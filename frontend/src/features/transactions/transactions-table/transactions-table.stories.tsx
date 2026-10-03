import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { TransactionResponse } from "@/api/generated/model";
import { getDebtsMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { getBulkCategorizeTransactionsMockHandler } from "@/api/generated/transactions/transactions.msw";
import { transactionRow } from "@/features/transactions/ledger-groups/ledger-rows";
import { useTransactionRowDialogs } from "@/features/transactions/transaction-row-actions/transaction-row-actions";
import { useTransactionSelection } from "@/features/transactions/transactions-page/use-transaction-selection";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import {
  accounts,
  categories,
  debts,
  foreignCurrencyTransactions,
  hugeAmountTransactions,
  linkedPaymentTransaction,
  linkedRefund,
  longDescriptionTransaction,
  receiptItemTransaction,
  refundedPurchase,
  refundTransactions,
  splitTransaction,
  tags,
  trackedMortgage,
  transactions,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { useInlineCategory } from "./category-cell";
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
  const selection = useTransactionSelection("story", new Set(initialSelectedIds));
  const selectableIds = data.filter(isSelectableTransaction).map((item) => item.id);
  const filters = useTransactionFilters({ accounts, categories });
  const columnHeaders = useTransactionColumnHeaders(filters, tags);
  const rowDialogs = useTransactionRowDialogs();
  const inlineCategory = useInlineCategory((id) => toast.message(`Categorized ${id}`));
  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    tagById,
    onEdit: (transaction) => toast.message(`Edit ${transaction.description ?? transaction.id}`),
    onDuplicate: (transaction) =>
      toast.message(`Duplicate ${transaction.description ?? transaction.id}`),
    onRefund: (transaction) => toast.message(`Refund ${transaction.description ?? transaction.id}`),
    onDelete: (id) => toast.message(`Delete ${id}`),
    deletingId,
    moreActions: rowDialogs.moreActions,
    onUpdateSplit: rowDialogs.onUpdateSplit,
    categories,
    inlineCategory,
  });

  return (
    <div className="p-6 lg:p-10">
      <TransactionsTable
        rows={data.map(transactionRow)}
        columns={columns}
        isPlaceholder={isPlaceholder}
        columnFilters={columnHeaders.byColumn}
        columnAriaSort={columnHeaders.ariaSortByColumn}
        filtered={columnHeaders.active}
        selection={{
          selectedIds: selection.selectedIds,
          selectableIds,
          rowLabel: (row) => `${row.date} ${row.description ?? ""}`,
          onToggle: (id, selected, extend) => selection.toggle(selectableIds, id, selected, extend),
          onTogglePage: (selected) => selection.togglePage(selectableIds, selected),
        }}
      />
      {rowDialogs.dialogs}
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

export const HugeAmounts: Story = {
  args: { data: hugeAmountTransactions },
  play: async ({ canvas, canvasElement }) => {
    const columns = [...canvasElement.querySelectorAll("col")].map((column) => column.className);
    await expect(columns).toContain("w-38");
    await expect(canvas.getByRole("table")).toHaveClass("min-w-202");
    await expect(canvas.getByText("−€1,234,567,890.12")).toHaveClass("whitespace-nowrap");
    await expect(canvas.getByText(/^−IDR\s2,000,000,000(?:\.00)?$/u)).toBeInTheDocument();
    await expect(canvas.getByText("+€1,250,000.00").parentElement).toHaveTextContent(
      "Refund+€1,250,000.00",
    );
  },
};

export const ForeignCurrency: Story = {
  args: { data: [...foreignCurrencyTransactions, ...transactions.slice(0, 3)] },
};

export const FilteredNoMatches: Story = {
  args: { data: [] },
  parameters: { route: "/transactions?type=expense&search=nothing" },
};

export const FoundByReceiptItem: Story = {
  args: { data: [receiptItemTransaction] },
  parameters: { route: "/transactions?search=dyson" },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/^Receipt item: DYSON V8 dulkių siurblys · warranty until .*2028$/u),
    ).toBeInTheDocument();
  },
};

export const StatementPayee: Story = {
  args: {
    data: [
      {
        ...longDescriptionTransaction,
        payeeName: null,
        payee: "MAXIMA LT, UAB",
        description: "Pirkinys 5168******1234 2026-09-14 MAXIMA X VILNIUS",
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("MAXIMA LT, UAB")).toBeInTheDocument();
    const account = accountNames.get(longDescriptionTransaction.accountId) ?? "";
    await expect(
      canvas.getByText(`${account} · Pirkinys 5168******1234 2026-09-14 MAXIMA X VILNIUS`),
    ).toBeInTheDocument();
  },
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
      canvas.getByRole("button", { name: `Actions: ${transactions[0]?.payeeName ?? ""}` }),
    );
    await userEvent.click(await screen.findByRole("menuitem", { name: "Link to debt" }));
    await expect(await openedDialog()).toHaveTextContent("Link to debt");
  },
};

export const Refunds: Story = {
  args: { data: refundTransactions },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByText("Refund")).toHaveLength(2);
    await expect(canvas.getByText("+€29.95")).toBeInTheDocument();
    await expect(canvas.getByText("−€89.95")).toBeInTheDocument();
    await expect(canvas.getByText("Refunded €29.95")).toBeInTheDocument();
    await expect(
      canvas.getByRole("link", { name: /^Refund of Zara, Akropolis, / }),
    ).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: `Actions: ${refundedPurchase.description ?? ""}` }),
    );
    await expect(await screen.findByRole("menuitem", { name: "Record refund" })).toBeVisible();
    await userEvent.keyboard("{Escape}");
    await userEvent.click(
      canvas.getByRole("button", { name: `Actions: ${linkedRefund.description ?? ""}` }),
    );
    await expect(await screen.findByRole("menuitem", { name: "Duplicate" })).toBeVisible();
    await expect(screen.queryByRole("menuitem", { name: "Record refund" })).toBeNull();
  },
};

const tagged = transactions.filter((item) => item.tagIds.length > 0).slice(0, 4);

export const TagsAndAccountUnderTheDescription: Story = {
  args: { data: tagged },
  play: async ({ canvas }) => {
    const row = first(tagged);
    const tagName = tags.find((tag) => tag.id === first(row.tagIds))?.name ?? "";
    const cell = first(canvas.getAllByText(tagName)).closest("td");
    await expect(cell).toHaveTextContent(row.payeeName ?? (row.payee || row.description) ?? "");
    await expect(cell).toHaveTextContent(accountNames.get(row.accountId) ?? "");
    await expect(canvas.getByRole("button", { name: "Filter by Description" })).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Filter by Tags" })).toBeNull();
    await expect(canvas.queryByRole("button", { name: "Filter by Account" })).toBeNull();
    const columns = [...canvas.getByRole("table").querySelectorAll("col")].map(
      (column) => column.className,
    );
    await expect(columns).toEqual(["w-10", "w-27", "", "w-44", "w-30", "w-23 pointer-coarse:w-29"]);
    await expect(canvas.getByRole("table")).toHaveClass("min-w-194");
  },
};

export const RangeSelection: Story = {
  play: async ({ canvas }) => {
    const boxes = canvas
      .getAllByRole("checkbox", { name: /^Select: / })
      .filter((box) => box.getAttribute("aria-disabled") !== "true");
    const [start, , , end, after, , last] = boxes;
    if (!start || !end || !after || !last) {
      throw new Error("the story needs seven selectable rows");
    }
    const user = userEvent.setup();
    await user.click(start);
    await user.keyboard("{Shift>}");
    await user.click(end);
    await user.keyboard("{/Shift}");
    await Promise.all(boxes.slice(0, 4).map((box) => expect(box).toBeChecked()));
    await expect(after).not.toBeChecked();

    last.focus();
    await user.keyboard("{Shift>}[Space]{/Shift}");
    await Promise.all(boxes.slice(0, 7).map((box) => expect(box).toBeChecked()));
  },
};
