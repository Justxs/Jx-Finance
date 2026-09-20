import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { Rows } from "@/components/ui/rows";
import {
  accounts,
  categories,
  dueSoonBill,
  inactiveBill,
  overdueBill,
  recurringBills,
  variableBill,
} from "@/storybook/fixtures";
import { openedDialog } from "@/storybook/interactions";
import { RecurringBillRow } from "./recurring-bill-row";

const longNameBill = recurringBills.find((bill) => bill.accountId === null) ?? dueSoonBill;

const meta = {
  title: "Features/RecurringBills/RecurringBillRow",
  component: RecurringBillRow,
  args: {
    bill: dueSoonBill,
    accounts,
    categories,
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  decorators: [
    function withList(Story) {
      return (
        <Rows className="w-[min(56rem,calc(100vw-3rem))]">
          <Story />
        </Rows>
      );
    },
  ],
} satisfies Meta<typeof RecurringBillRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const DueSoon: Story = { args: { bill: dueSoonBill } };

export const Overdue: Story = { args: { bill: overdueBill } };

export const Variable: Story = { args: { bill: variableBill } };

export const Inactive: Story = { args: { bill: inactiveBill } };

export const LongNameYearlyNoAccount: Story = { args: { bill: longNameBill } };

export const NoCategoryNoAccount: Story = {
  args: { bill: { ...dueSoonBill, categoryId: null, accountId: null } },
};

export const UnknownCategoryAndAccount: Story = { args: { accounts: [], categories: [] } };

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const DeleteDisabled: Story = { args: { deleteDisabled: true } };

export const EditDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(edit|redaguoti)(:|$)/i }));
    await openedDialog();
  },
};

export const ConfirmDialogOpenVariable: Story = {
  args: { bill: variableBill },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /^(record payment|registruoti mokėjimą)$/i }),
    );
    await openedDialog();
  },
};

export const ConfirmDialogOpenNoAccount: Story = {
  args: { bill: longNameBill },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /^(record payment|registruoti mokėjimą)$/i }),
    );
    await openedDialog();
  },
};
