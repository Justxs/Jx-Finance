import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { getUpdateRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { dueSoonBill, inactiveBill, recurringBills, variableBill } from "@/storybook/fixtures";
import { handlers, pending } from "@/storybook/handlers";
import { RecurringBillEditForm } from "./recurring-bill-edit-form";

const longNameBill = recurringBills.find((bill) => bill.accountId === null) ?? dueSoonBill;

const meta = {
  title: "Features/RecurringBills/RecurringBillEditForm",
  component: RecurringBillEditForm,
  args: { bill: dueSoonBill, onDone: fn() },
  decorators: [
    function withFormWidth(Story) {
      return (
        <div className="w-[min(32rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof RecurringBillEditForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Fixed: Story = { args: { bill: dueSoonBill } };

export const Variable: Story = { args: { bill: variableBill } };

export const Inactive: Story = { args: { bill: inactiveBill } };

export const LongName: Story = { args: { bill: longNameBill } };

export const InvalidAmount: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const amount = canvas.getAllByRole("textbox")[1]!;
    await userEvent.clear(amount);
    await userEvent.type(amount, "0");
  },
};

export const SavePending: Story = {
  parameters: {
    msw: {
      handlers: [getUpdateRecurringBillMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(save|išsaugoti)$/i }));
  },
};
