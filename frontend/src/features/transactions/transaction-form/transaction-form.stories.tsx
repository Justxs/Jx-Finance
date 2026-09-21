import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMutation } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { ApiError } from "@/api/client";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  categories,
  longDescriptionTransaction,
  splitTransaction,
  tags,
  transactions,
  uncategorisedTransaction,
} from "@/storybook/fixtures";
import { duplicateDraft } from "./transaction-draft";
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

function MutationBackedForm(args: Readonly<ComponentProps<typeof TransactionForm>>) {
  const mutation = useMutation({
    mutationFn: async (values: Parameters<typeof args.onSubmit>[0]) => args.onSubmit(values),
  });

  return (
    <div className="w-[min(42rem,90vw)]">
      <TransactionForm
        {...args}
        pending={mutation.isPending}
        error={mutation.error}
        onSubmit={(values) => mutation.mutateAsync(values)}
      />
    </div>
  );
}

const meta = {
  title: "Features/Transactions/TransactionForm",
  component: TransactionForm,
  args: { accounts, categories, tags, pending: false, onSubmit: fn(), onCancel: fn() },
  decorators: [withWidth("w-[min(42rem,90vw)]")],
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

export const NoTags: Story = { args: { tags: [] } };

export const WithAddAnother: Story = {
  args: { onSubmitAndAddAnother: fn(async () => true) },
};

export const PrefilledFromADuplicate: Story = {
  args: { prefill: duplicateDraft(splitTransaction) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const amounts = await canvas.findAllByLabelText("Amount");

    await expect(amounts[0]).toHaveValue("128.40");
    await expect(amounts).toHaveLength(4);
    await expect(canvas.getByRole("checkbox", { name: "Split into categories" })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Buto remontas" })).toBeChecked();
  },
};

export const SaveAsTemplate: Story = {
  args: { onSaveAsTemplate: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await fireEvent.change(await canvas.findByLabelText("Amount"), { target: { value: "12,50" } });
    await userEvent.click(canvas.getByRole("button", { name: "Save as template" }));
    await userEvent.type(await canvas.findByLabelText("Template name"), "Weekly shop");
    await userEvent.click(canvas.getByRole("button", { name: "Save template" }));

    await waitFor(() => expect(args.onSaveAsTemplate).toHaveBeenCalledTimes(1));
    await expect(args.onSaveAsTemplate).toHaveBeenCalledWith(
      "Weekly shop",
      expect.objectContaining({ amount: "12,50" }),
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const SaveAsTemplateHiddenWhenEditing: Story = {
  args: { initial: transactions[0], onSaveAsTemplate: fn() },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await canvas.findByLabelText("Amount");
    await expect(
      canvas.queryByRole("button", { name: "Save as template" }),
    ).not.toBeInTheDocument();
  },
};

export const SaveAndAddAnother: Story = {
  args: { onSubmitAndAddAnother: fn(async () => true) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const amount = await canvas.findByLabelText("Amount");
    const description = canvas.getByLabelText("Description");
    await fireEvent.change(amount, { target: { value: "12,50" } });
    await fireEvent.change(description, { target: { value: "Lidl" } });
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
    onSubmit: fn(() => Promise.reject(splitLineProblem)),
  },
  render: (args) => <MutationBackedForm {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await submitForm(canvasElement);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));

    const message = await canvas.findByText("Enter an amount greater than 0, e.g. 12.34.");
    await expect(message).toHaveAttribute("id", "tx-line-1-amount-error");
    const lineAmount = canvasElement.querySelector("#tx-line-1-amount");
    await expect(lineAmount).toHaveAttribute("aria-invalid", "true");
    await expect(lineAmount).toHaveAttribute("aria-describedby", "tx-line-1-amount-error");

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("The month is closed for this account.");
    await expect(alert).not.toHaveTextContent("Enter an amount greater than 0, e.g. 12.34.");
  },
};
