import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import type { AccountResponse } from "@/api/generated/model";
import { getConfirmRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  billInactiveProblem,
  billReceivedAmountProblem,
  billStaleProblem,
  brokerAccount,
  checkingAccount,
  crossCurrencyTransferBill,
  dueSoonBill,
  incomeBill,
  serverErrorProblem,
  transferBill,
  validationProblem,
  variableBill,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { RecurringBillConfirmForm } from "./recurring-bill-confirm-form";

const crossCurrencyAccounts: AccountResponse[] = accounts.map((account) =>
  account.id === brokerAccount.id ? { ...account, currency: "usd" } : account,
);

const meta = {
  title: "Features/RecurringBills/RecurringBillConfirmForm",
  component: RecurringBillConfirmForm,
  args: { bill: dueSoonBill, accounts, onDone: fn() },
  decorators: [withWidth("form")],
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

export const Income: Story = {
  args: { bill: incomeBill },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/as income dated/u)).toBeVisible();
    await expect(canvas.queryByLabelText("Amount received")).toBeNull();
  },
};

export const Transfer: Story = {
  args: { bill: transferBill },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByText(/as a transfer dated/u)).toBeVisible();
    await expect(canvas.queryByLabelText("Amount received")).toBeNull();
  },
};

export const CrossCurrencyTransfer: Story = {
  args: { bill: crossCurrencyTransferBill, accounts: crossCurrencyAccounts },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByLabelText("Amount received")).toBeVisible();
    await expect(canvas.getByText(/different currencies/u)).toBeVisible();
  },
};

export const CrossCurrencyTransferNeedsTheReceivedAmount: Story = {
  args: { bill: crossCurrencyTransferBill, accounts: crossCurrencyAccounts },
  play: async ({ canvasElement, args }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByText(/Enter an amount greater than 0/u)).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();

    await fireEvent.change(canvas.getByLabelText("Amount received"), {
      target: { value: "324.60" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const CrossCurrencyTransferRejectedByServer: Story = {
  args: { bill: crossCurrencyTransferBill, accounts: crossCurrencyAccounts },
  parameters: withHandlers(getConfirmRecurringBillMockHandler(failWith(billReceivedAmountProblem))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Amount received"), {
      target: { value: "324.60" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await expect(
      await canvas.findByText("Enter the received amount for a transfer between currencies."),
    ).toBeVisible();
  },
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

    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "48,73" } });
    await chooseOption(canvas.getByRole("combobox", { name: "Account" }), checkingAccount.name);
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const ConfirmPending: Story = {
  parameters: withHandlers(getConfirmRecurringBillMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = await confirm(canvasElement);

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Confirm" })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const StaleConfirmation: Story = {
  parameters: withHandlers(getConfirmRecurringBillMockHandler(failWith(billStaleProblem))),
  play: async ({ canvasElement, args }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByText(/already confirmed/u)).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Confirm" })).toBeEnabled();
    await expect(args.onDone).not.toHaveBeenCalled();
  },
};

export const InactiveBill: Story = {
  parameters: withHandlers(getConfirmRecurringBillMockHandler(failWith(billInactiveProblem))),
  play: async ({ canvasElement }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByText("This recurring entry is inactive.")).toBeVisible();
  },
};

export const ServerRejectsAmount: Story = {
  args: { bill: variableBill },
  parameters: withHandlers(getConfirmRecurringBillMockHandler(failWith(validationProblem))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "12" } });
    await userEvent.click(canvas.getByRole("button", { name: "Confirm" }));

    await waitFor(() =>
      expect(canvas.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true"),
    );
  },
};

export const ConfirmFails: Story = {
  parameters: withHandlers(getConfirmRecurringBillMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvasElement }) => {
    const canvas = await confirm(canvasElement);

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
