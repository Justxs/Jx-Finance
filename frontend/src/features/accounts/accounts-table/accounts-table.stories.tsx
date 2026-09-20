import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { accounts, checkingAccount, ids, sharedAccount } from "@/storybook/fixtures";
import { AccountsTable } from "./accounts-table";

const meta = {
  title: "Features/Accounts/AccountsTable",
  component: AccountsTable,
  parameters: { layout: "fullscreen", route: "/accounts" },
  args: {
    accounts,
    stale: false,
    onEdit: fn(),
    deletingId: null,
    onDelete: fn(),
    onConvert: fn(),
  },
  render: (args) => (
    <div className="p-6 lg:p-10">
      <QueryBoundary fallback={<Skeleton className="h-64 w-full" />}>
        <AccountsTable {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof AccountsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { accounts: [] } };

export const FilteredNoMatches: Story = {
  args: { accounts: [] },
  parameters: { route: "/accounts?search=nothing&type=cash" },
};

export const Sorted: Story = { parameters: { route: "/accounts?sort=name&direction=asc" } };

export const Stale: Story = { args: { stale: true } };

export const Deleting: Story = { args: { deletingId: ids.accounts.savings } };

export const LongContent: Story = {
  args: {
    accounts: [
      {
        ...checkingAccount,
        name: "Everyday current account used for salary, groceries, subscriptions and all card payments",
        description:
          "Salary lands here on the 10th, standing orders leave on the 11th, and whatever is left at the end of the month is swept into savings.",
        currentBalance: "1234567890.12",
      },
      sharedAccount,
    ],
  },
};
