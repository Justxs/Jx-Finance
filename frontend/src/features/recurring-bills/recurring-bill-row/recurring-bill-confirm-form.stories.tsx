import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn, userEvent, within } from "storybook/test";
import { getConfirmRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { accounts, dueSoonBill, serverErrorProblem, variableBill } from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { RecurringBillConfirmForm } from "./recurring-bill-confirm-form";

const meta = {
  title: "Features/RecurringBills/RecurringBillConfirmForm",
  component: RecurringBillConfirmForm,
  args: { bill: dueSoonBill, accounts, onDone: fn() },
  decorators: [
    function withFormWidth(Story) {
      return (
        <div className="w-[min(32rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof RecurringBillConfirmForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FixedWithDefaultAccount: Story = { args: { bill: dueSoonBill } };

export const FixedWithoutDefaultAccount: Story = {
  args: { bill: { ...dueSoonBill, accountId: null } },
};

export const VariableWithDefaultAccount: Story = { args: { bill: variableBill } };

export const VariableWithoutDefaultAccount: Story = {
  args: { bill: { ...variableBill, accountId: null } },
};

export const VariableAmountEntered: Story = {
  args: { bill: variableBill },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox"), "48.73");
  },
};

export const WithoutDefaultAccountNoAccounts: Story = {
  args: { bill: { ...dueSoonBill, accountId: null }, accounts: [] },
};

export const ConfirmPending: Story = {
  parameters: {
    msw: {
      handlers: [getConfirmRecurringBillMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(confirm|patvirtinti)(:|$)/i }));
  },
};

export const ConfirmFails: Story = {
  parameters: {
    msw: {
      handlers: [
        getConfirmRecurringBillMockHandler(failWith(serverErrorProblem, 500)),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: /^(confirm|patvirtinti)(:|$)/i }));
  },
};
