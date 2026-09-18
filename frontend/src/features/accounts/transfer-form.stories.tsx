import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { accounts, checkingAccount } from "@/storybook/fixtures";
import { TransferForm } from "./transfer-form";

const meta = {
  title: "Features/Accounts/TransferForm",
  component: TransferForm,
  args: { accounts, pending: false, onSubmit: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(36rem,90vw)]">
      <TransferForm {...args} />
    </div>
  ),
} satisfies Meta<typeof TransferForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Pending: Story = { args: { pending: true } };

export const WithoutCancel: Story = { args: { onCancel: undefined } };

export const SingleAccount: Story = { args: { accounts: [checkingAccount] } };

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
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button");
    const submit = buttons.find((button) => button.getAttribute("type") === "submit");
    if (submit) {
      await userEvent.click(submit);
    }
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
