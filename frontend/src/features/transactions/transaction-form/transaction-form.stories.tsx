import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { ApiError } from "@/api/client";
import {
  accounts,
  categories,
  longDescriptionTransaction,
  splitTransaction,
  transactions,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { TransactionForm } from "./transaction-form";

const splitLineProblem = new ApiError({
  status: 400,
  title: "One or more validation errors occurred.",
  errors: [
    {
      name: "lines[1].amount",
      reason: "Line amount must be a decimal greater than 0.",
      code: "money.positive",
    },
    { name: "generalErrors", reason: "The month is closed for this account." },
  ],
});

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

export const WithAddAnother: Story = {
  args: { onSubmitAndAddAnother: fn(async () => true) },
};

export const SaveAndAddAnother: Story = {
  args: { onSubmitAndAddAnother: fn(async () => true) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const amount = await canvas.findByLabelText("Amount");
    const description = canvas.getByLabelText("Description");
    fireEvent.change(amount, { target: { value: "12,50" } });
    fireEvent.change(description, { target: { value: "Lidl" } });
    await userEvent.click(canvas.getByRole("button", { name: "Save and add another" }));
    await waitFor(() => expect(args.onSubmitAndAddAnother).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(amount).toHaveValue(""));
    await expect(description).toHaveValue("");
    await expect(amount).toHaveFocus();
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement, args }) => {
    await submitForm(canvasElement);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ServerLineError: Story = {
  args: {
    initial: splitTransaction,
    error: splitLineProblem,
    onSubmit: fn(() => Promise.reject(splitLineProblem)),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await submitForm(canvasElement);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));

    const message = await canvas.findByText("Enter an amount greater than 0, e.g. 12.34.");
    await expect(message).toHaveAttribute("id", "tx-line-1-amount-error");
    const lineAmount = canvasElement.querySelector("#tx-line-1-amount");
    await expect(lineAmount).toHaveAttribute("aria-invalid", "true");
    await expect(lineAmount).toHaveAttribute("aria-describedby", "tx-line-1-amount-error");

    const alert = canvas.getByRole("alert");
    await expect(alert).toHaveTextContent("The month is closed for this account.");
    await expect(alert).not.toHaveTextContent("Enter an amount greater than 0, e.g. 12.34.");
  },
};
