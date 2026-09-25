import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getCreateTransferMockHandler } from "@/api/generated/transfers/transfers.msw";
import { withWidth } from "@/storybook/decorators";
import { accounts, brokerAccount, checkingAccount } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { TransferForm } from "./transfer-form";

const meta = {
  title: "Features/Accounts/TransferForm",
  component: TransferForm,
  args: { accounts, onClose: fn() },
  decorators: [withWidth("w-[min(36rem,90vw)]")],
} satisfies Meta<typeof TransferForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Transfers: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "120" } });
    await userEvent.click(canvas.getByRole("button", { name: "Transfer" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const Pending: Story = {
  parameters: withHandlers(getCreateTransferMockHandler(pending)),
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "120" } });
    const submit = canvas.getByRole("button", { name: "Transfer" });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const SingleAccount: Story = { args: { accounts: [checkingAccount] } };

export const CrossCurrency: Story = {
  args: {
    accounts: [checkingAccount, { ...brokerAccount, currency: "usd" }],
  },
};

export const NoAccounts: Story = { args: { accounts: [] } };

export const LongAccountNames: Story = {
  args: {
    accounts: accounts.map((account) => ({
      ...account,
      name: `${account.name} with a considerably longer descriptive label than usual`,
    })),
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvas, args }) => {
    const buttons = await canvas.findAllByRole("button");
    const submit = buttons.find((button) => button.getAttribute("type") === "submit");
    if (submit) {
      await userEvent.click(submit);
    }
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
