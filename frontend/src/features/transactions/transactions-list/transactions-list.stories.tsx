import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  categories,
  longDescriptionTransaction,
  splitTransaction,
  tags,
  transactions,
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
    data: transactions.slice(0, 8),
    accountNames,
    categoryById,
    tagById,
    isPlaceholder: false,
    filtered: false,
    onEdit: fn(),
    onDuplicate: fn(),
    onDelete: fn(),
    deletingId: null,
  },
  parameters: { layout: "fullscreen" },
  decorators: [withWidth("mx-auto w-full max-w-[23.4375rem] px-4 py-4")],
} satisfies Meta<typeof TransactionsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongLithuanianText: Story = {
  args: {
    data: [
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
    ],
  },
  globals: { locale: "lt" },
};

export const Empty: Story = { args: { data: [] } };

export const FilteredNoMatches: Story = { args: { data: [], filtered: true } };

export const Placeholder: Story = {
  args: { isPlaceholder: true },
};

export const Deleting: Story = { args: { deletingId: transactions[1]?.id ?? null } };

export const OptimisticRow: Story = {
  args: {
    data: transactions
      .slice(0, 4)
      .map((item, index) =>
        index === 0 ? { ...item, id: "optimistic-1", description: "Saving in progress" } : item,
      ),
  },
};
