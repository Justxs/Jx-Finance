import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import {
  accounts,
  categories,
  longDescriptionTransaction,
  splitTransaction,
  transactions,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { TransactionForm } from "./transaction-form";

const incomeTransaction = transactions.find((item) => item.type === "income") ?? transactions[0];

async function submitForm(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const buttons = await canvas.findAllByRole("button");
  const submit = buttons.find((button) => button.getAttribute("type") === "submit");
  if (submit) {
    await userEvent.click(submit);
  }
}

const meta = {
  title: "Features/Transactions/TransactionForm",
  component: TransactionForm,
  args: { accounts, categories, pending: false, onSubmit: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(42rem,90vw)]">
      <TransactionForm {...args} />
    </div>
  ),
} satisfies Meta<typeof TransactionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const EditExpense: Story = { args: { initial: transactions[0] } };

export const EditIncome: Story = { args: { initial: incomeTransaction } };

export const EditSplit: Story = { args: { initial: splitTransaction } };

export const EditUncategorised: Story = { args: { initial: uncategorisedTransaction } };

export const LongDescription: Story = { args: { initial: longDescriptionTransaction } };

export const SplitTotalMismatch: Story = {
  args: { initial: { ...splitTransaction, amount: "999.99" } },
  play: async ({ canvasElement, args }) => {
    await submitForm(canvasElement);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const Pending: Story = { args: { initial: transactions[0], pending: true } };

export const WithoutCancel: Story = { args: { onCancel: undefined } };

export const NoCategories: Story = { args: { categories: [] } };

export const NoAccounts: Story = { args: { accounts: [] } };

export const ValidationErrors: Story = {
  play: async ({ canvasElement, args }) => {
    await submitForm(canvasElement);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};
