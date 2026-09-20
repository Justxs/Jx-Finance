import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getUpdateTransferMockHandler } from "@/api/generated/transfers/transfers.msw";
import {
  accounts,
  checkingAccount,
  crossCurrencyTransfer,
  importedBothTransfer,
  importedFromTransfer,
  importedToCrossCurrencyTransfer,
  manualTransfer,
  notFoundProblem,
  savingsAccount,
  transferAmountMismatchProblem,
  transferForbiddenProblem,
  transferLockedProblem,
} from "@/storybook/fixtures";
import { failWith, handlers, pending } from "@/storybook/handlers";
import { chooseOption, openedDialog } from "@/storybook/interactions";
import { TransferEditDialog } from "./transfer-edit-dialog";

const meta = {
  title: "Features/Accounts/TransferEditDialog",
  component: TransferEditDialog,
  args: { accounts, transfer: manualTransfer, onClose: fn() },
} satisfies Meta<typeof TransferEditDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function saveWithAmount(amount: string) {
  const dialog = within(await openedDialog());
  fireEvent.change(dialog.getByLabelText("Amount"), { target: { value: amount } });
  await userEvent.click(dialog.getByRole("button", { name: "Save" }));
  return dialog;
}

export const Default: Story = {
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Amount")).toHaveValue("400.00");
    await expect(dialog.getByLabelText("Description")).toHaveValue("Mėnesio taupymas");
    await expect(dialog.getByRole("combobox", { name: "From" })).toHaveTextContent(
      checkingAccount.name,
    );
    await expect(dialog.getByRole("combobox", { name: "To" })).toHaveTextContent(
      savingsAccount.name,
    );
    await expect(dialog.getByRole("combobox", { name: "From" })).toBeEnabled();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Closed: Story = { args: { transfer: null } };

export const CrossCurrency: Story = {
  args: { transfer: crossCurrencyTransfer },
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Received")).toHaveValue("1084.20");
    await expect(dialog.getByLabelText("Received")).toBeEnabled();
  },
};

export const AccountNoLongerVisible: Story = {
  args: { accounts: [checkingAccount] },
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByRole("combobox", { name: "To" })).toHaveTextContent(
      "Account not available",
    );
  },
};

export const ImportedFromSide: Story = {
  args: { transfer: importedFromTransfer },
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByText(/was imported into Swedbank einamoji/u)).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "From" })).toBeDisabled();
    await expect(dialog.getByLabelText("Amount")).toBeDisabled();
    await expect(dialog.getByRole("button", { name: /^Date/u })).toBeDisabled();
    await expect(dialog.getByRole("combobox", { name: "To" })).toBeEnabled();
    await expect(dialog.getByLabelText("Description")).toBeEnabled();
    await expect(dialog.getAllByText("Fixed by the import.").length).toBeGreaterThan(0);
  },
};

export const ImportedToSideCrossCurrency: Story = {
  args: { transfer: importedToCrossCurrencyTransfer },
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByRole("combobox", { name: "To" })).toBeDisabled();
    await expect(dialog.getByLabelText("Received")).toBeDisabled();
    await expect(dialog.getByLabelText("Received")).toHaveValue("1084.20");
    await expect(dialog.getByLabelText("Amount")).toBeEnabled();
    await expect(dialog.getByRole("combobox", { name: "From" })).toBeEnabled();
  },
};

export const ImportedBothSides: Story = {
  args: { transfer: importedBothTransfer },
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByText(/only the description can change/u)).toBeVisible();
    await expect(dialog.getByRole("combobox", { name: "From" })).toBeDisabled();
    await expect(dialog.getByRole("combobox", { name: "To" })).toBeDisabled();
    await expect(dialog.getByLabelText("Amount")).toBeDisabled();
    await expect(dialog.getByLabelText("Description")).toBeEnabled();
  },
};

export const SavesChanges: Story = {
  play: async ({ args }) => {
    const dialog = within(await openedDialog());
    await chooseOption(dialog.getByRole("combobox", { name: "To" }), /Bendra/u);
    await saveWithAmount("450,50");

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const RejectsSameAccount: Story = {
  play: async ({ args }) => {
    const dialog = within(await openedDialog());
    await chooseOption(dialog.getByRole("combobox", { name: "To" }), checkingAccount.name);

    await expect(
      await dialog.findByText("Source and destination accounts must differ."),
    ).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Pending: Story = {
  parameters: { msw: { handlers: [getUpdateTransferMockHandler(pending), ...handlers] } },
  play: async () => {
    const dialog = await saveWithAmount("410");

    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Save" })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const LockedValueRefused: Story = {
  parameters: {
    msw: {
      handlers: [getUpdateTransferMockHandler(failWith(transferLockedProblem, 400)), ...handlers],
    },
  },
  play: async ({ args }) => {
    const dialog = await saveWithAmount("410");

    await expect(await dialog.findByText("This can no longer be changed.")).toBeVisible();
    await expect(dialog.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const AmountMismatch: Story = {
  args: { transfer: crossCurrencyTransfer },
  parameters: {
    msw: {
      handlers: [
        getUpdateTransferMockHandler(failWith(transferAmountMismatchProblem, 400)),
        ...handlers,
      ],
    },
  },
  play: async () => {
    const dialog = await saveWithAmount("1000");

    await expect(
      await dialog.findByText("Sent and received amounts must match in the same currency."),
    ).toBeVisible();
  },
};

export const Forbidden: Story = {
  parameters: {
    msw: {
      handlers: [
        getUpdateTransferMockHandler(failWith(transferForbiddenProblem, 403)),
        ...handlers,
      ],
    },
  },
  play: async () => {
    const dialog = await saveWithAmount("410");

    await expect(await dialog.findByText("You do not have permission to do this.")).toBeVisible();
  },
};

export const TransferNoLongerExists: Story = {
  parameters: {
    msw: {
      handlers: [getUpdateTransferMockHandler(failWith(notFoundProblem, 404)), ...handlers],
    },
  },
  play: async () => {
    const dialog = await saveWithAmount("410");

    await expect(await dialog.findByRole("alert")).toBeVisible();
  },
};
