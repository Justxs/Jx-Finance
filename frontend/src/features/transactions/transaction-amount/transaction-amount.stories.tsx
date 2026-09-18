import type { Meta, StoryObj } from "@storybook/react-vite";
import type { TransactionResponse } from "@/api/generated/model";
import { longDescriptionTransaction } from "@/storybook/fixtures";
import { TransactionAmount } from "./transaction-amount";
import { optimisticId } from "./transaction-row";

const expense: TransactionResponse = { ...longDescriptionTransaction, type: "expense" };
const income: TransactionResponse = { ...expense, type: "income" };
const foreign: TransactionResponse = { ...expense, currency: "gbp", reportingAmount: "1485.09" };

const meta = {
  title: "Features/Transactions/TransactionAmount",
  component: TransactionAmount,
  args: { transaction: expense, showReporting: false },
} satisfies Meta<typeof TransactionAmount>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Expense: Story = {};

export const Income: Story = { args: { transaction: income } };

export const ForeignCurrency: Story = { args: { transaction: foreign, showReporting: true } };

export const ForeignCurrencyWithoutReporting: Story = { args: { transaction: foreign } };

export const OptimisticForeignCurrency: Story = {
  args: { transaction: { ...foreign, id: optimisticId(1) }, showReporting: true },
};
