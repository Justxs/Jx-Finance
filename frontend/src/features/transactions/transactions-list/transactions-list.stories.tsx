import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { transactionRow } from "@/features/transactions/ledger-groups/ledger-rows";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  categories,
  longDescriptionTransaction,
  partlyMatchingTripGroup,
  receiptItemTransaction,
  refundTransactions,
  splitTransaction,
  tags,
  transactions,
  tripGroup,
  tripGroupMembers,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { TransactionsList } from "./transactions-list";

const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const tagById = new Map(tags.map((tag) => [tag.id, tag]));

const meta = {
  title: "Features/Transactions/TransactionsList",
  component: TransactionsList,
  args: {
    rows: transactions.slice(0, 8).map(transactionRow),
    accountNames,
    categoryById,
    tagById,
    isPlaceholder: false,
    filtered: false,
    onEdit: fn(),
    onDuplicate: fn(),
    onRefund: fn(),
    onDelete: fn(),
    deletingId: null,
    moreActions: () => [],
    onUpdateSplit: fn(),
  },
  parameters: { layout: "fullscreen" },
  decorators: [withWidth("mx-auto w-full max-w-[23.4375rem] px-4 py-4")],
} satisfies Meta<typeof TransactionsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLithuanianText: Story = {
  args: {
    rows: [
      longDescriptionTransaction,
      {
        ...longDescriptionTransaction,
        id: "long-lt-1",
        description:
          "Šiaulių apskrities vartotojų kooperatyvo parduotuvė „Žemaitijos ūkininkų gėrybės“, mokėjimas kortele",
        amount: "12480.95",
      },
      {
        ...longDescriptionTransaction,
        id: "long-lt-2",
        description: null,
      },
      splitTransaction,
      uncategorisedTransaction,
    ].map(transactionRow),
  },
  globals: { locale: "lt" },
};

export const Empty: Story = { args: { rows: [] } };

export const FilteredNoMatches: Story = { args: { rows: [], filtered: true } };

export const Placeholder: Story = {
  args: { isPlaceholder: true },
};

export const Deleting: Story = { args: { deletingId: transactions[1]?.id ?? null } };

export const OptimisticRow: Story = {
  args: {
    rows: transactions
      .slice(0, 4)
      .map((item, index) =>
        index === 0 ? { ...item, id: "optimistic-1", description: "Saving in progress" } : item,
      )
      .map(transactionRow),
  },
};

export const Refunds: Story = { args: { rows: refundTransactions.map(transactionRow) } };

export const FoundByReceiptItem: Story = {
  args: { rows: [transactionRow(receiptItemTransaction)], filtered: true },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("SENUKAI")).toBeInTheDocument();
    await expect(
      canvas.getByText(/^Receipt item: DYSON V8 dulkių siurblys · warranty until .*2028$/u),
    ).toBeInTheDocument();
  },
};

const groupHandlers = {
  onToggle: fn(),
  actions: () => [],
  pendingId: null,
  focusRef: () => undefined,
};

export const WithGroup: Story = {
  args: {
    rows: [
      transactionRow(transactions[0]!),
      { kind: "group", group: tripGroup, expanded: false },
      transactionRow(transactions[1]!),
    ],
    groups: groupHandlers,
  },
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole("button", { name: "Show the 3 rows of Kelionė į Rygą" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.getByText("−€300.40")).toBeInTheDocument();
  },
};

export const WithExpandedGroup: Story = {
  args: {
    rows: [
      { kind: "group", group: partlyMatchingTripGroup, expanded: true },
      { kind: "transaction", transaction: tripGroupMembers[2]!, member: true },
      transactionRow(transactions[1]!),
    ],
    groups: groupHandlers,
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Show the 3 rows of Kelionė į Rygą" }),
    ).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.getByText(/1 of 3 match/)).toBeInTheDocument();
  },
};
