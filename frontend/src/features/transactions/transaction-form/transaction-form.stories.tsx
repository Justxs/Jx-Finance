import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMutation } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { ApiError } from "@/api/client";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  categories,
  linkedRefund,
  longDescriptionTransaction,
  settingsWith,
  splitTransaction,
  spreadRefundProblem,
  spreadTransaction,
  tags,
  transactions,
  uncategorisedTransaction,
  unlinkedRefund,
} from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { type Canvas, chooseOption } from "@/storybook/interactions";
import { duplicateDraft, refundDraft } from "./transaction-draft";
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

async function submitForm(canvas: Canvas) {
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
  play: async ({ canvas, args }) => {
    await submitForm(canvas);
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
  play: async ({ canvas }) => {
    const amounts = await canvas.findAllByLabelText("Amount");

    await expect(amounts[0]).toHaveValue("128.40");
    await expect(amounts).toHaveLength(4);
    await expect(canvas.getByRole("checkbox", { name: "Split into categories" })).toBeChecked();
    await expect(canvas.getByRole("checkbox", { name: "Buto remontas" })).toBeChecked();
  },
};

export const SaveAsTemplate: Story = {
  args: { onSaveAsTemplate: fn() },
  play: async ({ canvas, args }) => {
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
  play: async ({ canvas }) => {
    await canvas.findByLabelText("Amount");
    await expect(
      canvas.queryByRole("button", { name: "Save as template" }),
    ).not.toBeInTheDocument();
  },
};

export const SaveAndAddAnother: Story = {
  args: { onSubmitAndAddAnother: fn(async () => true) },
  play: async ({ canvas, args }) => {
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

export const EditingANote: Story = {
  args: { initial: transactions[7] },
  play: async ({ canvas, args }) => {
    const note = await canvas.findByLabelText("Note");
    await expect(note).toHaveValue("Filmas su vaikais per atostogas");
    await fireEvent.change(note, { target: { value: "  Tomo gimtadienis  " } });
    await submitForm(canvas);
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ note: "Tomo gimtadienis", description: "Forum Cinemas Vingis" }),
      ),
    );
  },
};

export const EditingAPlace: Story = {
  args: { initial: transactions[0] },
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ features: { locations: true } }))),
  play: async ({ canvas, args }) => {
    const place = await canvas.findByRole("combobox", { name: "Place" });
    await expect(place).toHaveValue("Maxima X, Ukmergės g. 282, Vilnius");
    await expect(canvas.getByText(/Location saved/u)).toBeVisible();
    await fireEvent.change(place, { target: { value: "  Maxima X, Ukmergės g. 282  " } });
    await submitForm(canvas);
    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          place: "Maxima X, Ukmergės g. 282",
          latitude: 54.72381,
          longitude: 25.23612,
        }),
      ),
    );
  },
};

export const PlaceHiddenWhileTheSwitchIsOff: Story = {
  args: { initial: transactions[0] },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Note")).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: "Place" })).toBeNull();
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvas, args }) => {
    await submitForm(canvas);
    await expect(args.onSubmit).not.toHaveBeenCalled();
  },
};

export const ServerLineError: Story = {
  args: {
    initial: splitTransaction,
    onSubmit: fn(() => Promise.reject(splitLineProblem)),
  },
  render: (args) => <MutationBackedForm {...args} />,
  play: async ({ canvas, canvasElement, args }) => {
    await submitForm(canvas);
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

export const RecordRefundOfAPurchase: Story = {
  args: { prefill: refundDraft(transactions[0] ?? linkedRefund) },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByRole("radio", { name: "Refund" })).toBeChecked();
    await expect(canvas.getByLabelText("Amount")).toHaveValue("42.18");
    await expect(canvas.getByText(/^Refund of Maxima X, Ukmergės g\., /u)).toBeInTheDocument();
    await expect(
      canvas.queryByRole("checkbox", { name: "Split into categories" }),
    ).not.toBeInTheDocument();

    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "10,00" } });
    await submitForm(canvas);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "expense",
        amount: "-10.00",
        refundOfTransactionId: transactions[0]?.id,
        lines: null,
      }),
    );
  },
};

export const EditLinkedRefund: Story = {
  args: { initial: linkedRefund },
  play: async ({ canvas, args }) => {
    await expect(await canvas.findByRole("radio", { name: "Refund" })).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Unlink the purchase" }));
    await expect(canvas.queryByText(/^Refund of /u)).not.toBeInTheDocument();
    await submitForm(canvas);

    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "-29.95", refundOfTransactionId: null }),
    );
  },
};

export const EditUnlinkedRefund: Story = {
  args: { initial: unlinkedRefund },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("radio", { name: "Refund" })).toBeChecked();
    await expect(canvas.getByLabelText("Amount")).toHaveValue("5.00");
    await expect(canvas.queryByText(/^Refund of /u)).not.toBeInTheDocument();
  },
};

export const SpreadOverTwelveMonths: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(await canvas.findByLabelText("Amount"), {
      target: { value: "360.00" },
    });
    await chooseOption(canvas.getByRole("combobox", { name: "Spread over" }), "12 months");
    await submitForm(canvas);

    await waitFor(() =>
      expect(args.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ amount: "360.00", spreadMonths: 12 }),
      ),
    );
  },
};

export const EditSpread: Story = {
  args: { initial: spreadTransaction },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("combobox", { name: "Spread over" })).toHaveTextContent(
      "12 months",
    );
    await userEvent.click(canvas.getByRole("checkbox", { name: "Split into categories" }));
    await expect(canvas.queryByRole("combobox", { name: "Spread over" })).toBeNull();
  },
};

export const SpreadRefundRefused: Story = {
  args: {
    initial: spreadTransaction,
    onSubmit: fn(() => Promise.reject(new ApiError(spreadRefundProblem))),
  },
  render: (args) => <MutationBackedForm {...args} />,
  play: async ({ canvas, args }) => {
    await submitForm(canvas);
    await waitFor(() => expect(args.onSubmit).toHaveBeenCalledTimes(1));

    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "A refund cannot be spread over months.",
    );
  },
};
