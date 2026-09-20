import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getConfirmRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import {
  accounts,
  billInactiveProblem,
  billStaleProblem,
  checkingAccount,
  dueSoonBill,
  serverErrorProblem,
  validationProblem,
  variableBill,
} from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
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

async function confirm(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));
  return canvas;
}

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const FixedWithoutDefaultAccount: Story = {
  args: { bill: { ...dueSoonBill, accountId: null } },
};

export const VariableWithDefaultAccount: Story = { args: { bill: variableBill } };

export const VariableWithoutDefaultAccount: Story = {
  args: { bill: { ...variableBill, accountId: null } },
};

export const WithoutDefaultAccountNoAccounts: Story = {
  args: { bill: { ...dueSoonBill, accountId: null }, accounts: [] },
};

export const ConfirmsFixedBill: Story = {
  play: async ({ canvasElement, args }) => {
    await confirm(canvasElement);

    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const RequiresAmountAndAccount: Story = {
  args: { bill: { ...variableBill, accountId: null } },
  play: async ({ canvasElement, args }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByText(/Enter an amount greater than 0/u)).toBeVisible();
    await expect(canvas.getByText("This field is required.")).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();

    fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "48,73" } });
    await chooseOption(canvas.getByRole("combobox", { name: "Account" }), checkingAccount.name);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const ConfirmPending: Story = {
  parameters: {
    msw: { handlers: [getConfirmRecurringBillMockHandler(pending), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    const canvas = await confirm(canvasElement);

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Confirm" })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const StaleConfirmation: Story = {
  parameters: {
    msw: {
      handlers: [getConfirmRecurringBillMockHandler(failWith(billStaleProblem, 409)), ...handlers],
    },
  },
  play: async ({ canvasElement, args }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByText(/already confirmed/u)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Confirm" })).toBeEnabled();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

export const InactiveBill: Story = {
  parameters: {
    msw: {
      handlers: [
        getConfirmRecurringBillMockHandler(failWith(billInactiveProblem, 409)),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByText("This bill is inactive.")).toBeVisible();
  },
};

export const ServerRejectsAmount: Story = {
  args: { bill: variableBill },
  parameters: {
    msw: {
      handlers: [getConfirmRecurringBillMockHandler(failWith(validationProblem, 400)), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "12" } });
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(canvas.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true"),
    );
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
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
