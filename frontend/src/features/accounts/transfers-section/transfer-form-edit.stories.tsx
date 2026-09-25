import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getUpdateTransferMockHandler } from "@/api/generated/transfers/transfers.msw";
import { withWidth } from "@/storybook/decorators";
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
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { type Canvas, chooseOption } from "@/storybook/interactions";
import { TransferForm } from "./transfer-form";

const meta = {
  title: "Features/Accounts/TransferForm/Edit",
  component: TransferForm,
  args: { accounts, transfer: manualTransfer, onClose: fn() },
  decorators: [withWidth("w-[min(36rem,90vw)]")],
} satisfies Meta<typeof TransferForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function saveWithAmount(canvas: Canvas, amount: string) {
  await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: amount } });
  await userEvent.click(canvas.getByRole("button", { name: "Save" }));
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Amount")).toHaveValue("400.00");
    await expect(canvas.getByLabelText("Description")).toHaveValue("Mėnesio taupymas");
    await expect(canvas.getByRole("combobox", { name: "From" })).toHaveTextContent(
      checkingAccount.name,
    );
    await expect(canvas.getByRole("combobox", { name: "To" })).toHaveTextContent(
      savingsAccount.name,
    );
    await expect(canvas.getByRole("combobox", { name: "From" })).toBeEnabled();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const CrossCurrency: Story = {
  args: { transfer: crossCurrencyTransfer },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Received")).toHaveValue("1084.20");
    await expect(canvas.getByLabelText("Received")).toBeEnabled();
  },
};

export const AccountNoLongerVisible: Story = {
  args: { accounts: [checkingAccount] },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "To" })).toHaveTextContent(
      "Account not available",
    );
  },
};

export const ImportedFromSide: Story = {
  args: { transfer: importedFromTransfer },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/was imported into Swedbank einamoji/u)).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "From" })).toBeDisabled();
    await expect(canvas.getByLabelText("Amount")).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /^Date/u })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "To" })).toBeEnabled();
    await expect(canvas.getByLabelText("Description")).toBeEnabled();
    await expect(canvas.getAllByText("Fixed by the import.").length).toBeGreaterThan(0);
  },
};

export const ImportedToSideCrossCurrency: Story = {
  args: { transfer: importedToCrossCurrencyTransfer },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("combobox", { name: "To" })).toBeDisabled();
    await expect(canvas.getByLabelText("Received")).toBeDisabled();
    await expect(canvas.getByLabelText("Received")).toHaveValue("1084.20");
    await expect(canvas.getByLabelText("Amount")).toBeEnabled();
    await expect(canvas.getByRole("combobox", { name: "From" })).toBeEnabled();
  },
};

export const ImportedBothSides: Story = {
  args: { transfer: importedBothTransfer },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/only the description can change/u)).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "From" })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "To" })).toBeDisabled();
    await expect(canvas.getByLabelText("Amount")).toBeDisabled();
    await expect(canvas.getByLabelText("Description")).toBeEnabled();
  },
};

export const SavesChanges: Story = {
  play: async ({ canvas, args }) => {
    await chooseOption(canvas.getByRole("combobox", { name: "To" }), /Bendra/u);
    await saveWithAmount(canvas, "450,50");

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const RejectsSameAccount: Story = {
  play: async ({ canvas, args }) => {
    await chooseOption(canvas.getByRole("combobox", { name: "To" }), checkingAccount.name);

    await expect(
      await canvas.findByText("Source and destination accounts must differ."),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Pending: Story = {
  parameters: withHandlers(getUpdateTransferMockHandler(pending)),
  play: async ({ canvas }) => {
    await saveWithAmount(canvas, "410");

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Save" })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const LockedValueRefused: Story = {
  parameters: withHandlers(getUpdateTransferMockHandler(failWith(transferLockedProblem))),
  play: async ({ canvas, args }) => {
    await saveWithAmount(canvas, "410");

    await expect(await canvas.findByText("This can no longer be changed.")).toBeVisible();
    await expect(canvas.getByLabelText("Amount")).toHaveAttribute("aria-invalid", "true");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const AmountMismatch: Story = {
  args: { transfer: crossCurrencyTransfer },
  parameters: withHandlers(getUpdateTransferMockHandler(failWith(transferAmountMismatchProblem))),
  play: async ({ canvas }) => {
    await saveWithAmount(canvas, "1000");

    await expect(
      await canvas.findByText("Sent and received amounts must match in the same currency."),
    ).toBeVisible();
  },
};

export const Forbidden: Story = {
  parameters: withHandlers(getUpdateTransferMockHandler(failWith(transferForbiddenProblem))),
  play: async ({ canvas }) => {
    await saveWithAmount(canvas, "410");

    await expect(await canvas.findByText("You do not have permission to do this.")).toBeVisible();
  },
};

export const TransferNoLongerExists: Story = {
  parameters: withHandlers(getUpdateTransferMockHandler(failWith(notFoundProblem))),
  play: async ({ canvas }) => {
    await saveWithAmount(canvas, "410");

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
