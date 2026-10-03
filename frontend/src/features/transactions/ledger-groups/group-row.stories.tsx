import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { expect, screen, userEvent, within } from "storybook/test";
import type { LedgerItemResponse, TransactionGroupMembersParams } from "@/api/generated/model";
import { getTransactionGroupMembersMockHandler } from "@/api/generated/transaction-groups/transaction-groups.msw";
import { useInlineCategory } from "@/components/category-cell/category-cell";
import { useTransactionRowDialogs } from "@/features/transactions/transaction-row-actions/transaction-row-actions";
import { TransactionsTable } from "@/features/transactions/transactions-table/transactions-table";
import { useTransactionColumns } from "@/features/transactions/transactions-table/use-transaction-columns";
import {
  accounts,
  categories,
  familyHousehold,
  ledgerItemsOf,
  partlyMatchingTripGroup,
  serverErrorProblem,
  sharedTripGroup,
  tags,
  transactions,
  tripGroup,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { useLedgerGroups } from "./use-ledger-groups";

const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
const categoryById = new Map(categories.map((category) => [category.id, category]));
const tagById = new Map(tags.map((tag) => [tag.id, tag]));
const NO_FILTER: TransactionGroupMembersParams = {};

interface HarnessProps {
  items: LedgerItemResponse[];
  filter?: TransactionGroupMembersParams;
}

function LedgerHarness({ items, filter = NO_FILTER }: Readonly<HarnessProps>) {
  const rowDialogs = useTransactionRowDialogs();
  const inlineCategory = useInlineCategory((id) => toast.message(`Categorized ${id}`));
  const groups = useLedgerGroups({ viewKey: "story", items, filter });
  const columns = useTransactionColumns({
    accountNames,
    categoryById,
    tagById,
    onEdit: (transaction) => toast.message(`Edit ${transaction.id}`),
    onDuplicate: (transaction) => toast.message(`Duplicate ${transaction.id}`),
    onRefund: (transaction) => toast.message(`Refund ${transaction.id}`),
    onDelete: (id) => toast.message(`Delete ${id}`),
    deletingId: null,
    moreActions: rowDialogs.moreActions,
    onUpdateSplit: rowDialogs.onUpdateSplit,
    categories,
    inlineCategory,
  });

  return (
    <div className="p-6 lg:p-10">
      <TransactionsTable
        rows={groups.rows}
        groups={groups.handlers}
        columns={columns}
        isPlaceholder={false}
        columnFilters={{}}
        filtered={false}
      />
      {rowDialogs.dialogs}
      {groups.dialogs}
    </div>
  );
}

const meta = {
  title: "Features/Transactions/GroupRow",
  component: LedgerHarness,
  args: { items: ledgerItemsOf(transactions.slice(0, 8), [tripGroup]) },
  parameters: { layout: "fullscreen", route: "/transactions" },
} satisfies Meta<typeof LedgerHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

const toggleName = "Show the 3 rows of Kelionė į Rygą";

export const Collapsed: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: toggleName })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await expect(canvas.getByText("3 rows")).toBeVisible();
    await expect(canvas.getByText("−€300.40")).toBeVisible();
    await expect(canvas.queryByText("Hotel Bergs, Ryga")).toBeNull();
  },
};

export const Expanded: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: toggleName }));
    await expect(await canvas.findByText("Hotel Bergs, Ryga")).toBeVisible();
    await expect(canvas.getByText("Circle K Ryga – degalai")).toBeVisible();
    await expect(canvas.getByRole("button", { name: toggleName })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Actions: Hotel Bergs, Ryga" }));
    await expect(await screen.findByRole("menuitem", { name: "Remove from group" })).toBeVisible();
  },
};

export const SharedWithHousehold: Story = {
  args: { items: ledgerItemsOf(transactions.slice(0, 8), [sharedTripGroup]) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(`Shared · ${familyHousehold.name}`)).toBeVisible();
  },
};

export const PartialMatch: Story = {
  args: {
    items: ledgerItemsOf(transactions.slice(0, 4), [partlyMatchingTripGroup]),
    filter: { search: "Circle K" },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText("1 of 3 match")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: toggleName }));
    await expect(await canvas.findByText("Circle K Ryga – degalai")).toBeVisible();
    await expect(canvas.queryByText("Hotel Bergs, Ryga")).toBeNull();
  },
};

export const MembersPending: Story = {
  parameters: withHandlers(getTransactionGroupMembersMockHandler(pending)),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: toggleName }));
    await expect(await canvas.findByRole("status", { name: "Loading" })).toBeInTheDocument();
  },
};

export const MembersError: Story = {
  parameters: withHandlers(getTransactionGroupMembersMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: toggleName }));
    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("Could not load this.");
    await expect(within(alert).getByRole("button", { name: "Try again" })).toBeVisible();
  },
};

export const Ungrouping: Story = {
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("button", { name: "Rename group: Kelionė į Rygą" }),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Ungroup: Kelionė į Rygą" }));
    const dialog = within(await screen.findByRole("alertdialog"));
    await expect(dialog.getByText("Kelionė į Rygą")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Ungroup" })).toBeVisible();
  },
};
