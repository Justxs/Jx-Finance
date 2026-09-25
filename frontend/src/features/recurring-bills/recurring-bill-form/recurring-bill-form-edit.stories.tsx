import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getUpdateRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  billCategoryProblem,
  categories,
  dueSoonBill,
  inactiveBill,
  incomeBill,
  notFoundProblem,
  recurringBills,
  savingsAccount,
  transferBill,
  variableBill,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { RecurringBillForm } from "./recurring-bill-form";

const longNameBill = recurringBills.find((bill) => bill.accountId === null) ?? dueSoonBill;

const meta = {
  title: "Features/RecurringBills/RecurringBillForm/Edit",
  component: RecurringBillForm,
  args: { bill: dueSoonBill, accounts, categories, onClose: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof RecurringBillForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByLabelText("Name")).toHaveValue(dueSoonBill.name);
    await expect(canvas.getByLabelText("Amount")).toHaveValue(dueSoonBill.amount);
    await expect(canvas.getByRole("checkbox", { name: "Active" })).toBeChecked();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Variable: Story = { args: { bill: variableBill } };

export const Inactive: Story = { args: { bill: inactiveBill } };

export const LongName: Story = { args: { bill: longNameBill } };

export const Income: Story = { args: { bill: incomeBill } };

export const Transfer: Story = { args: { bill: transferBill } };

export const SwitchesAnExpenseToATransfer: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await chooseOption(canvas.getByRole("combobox", { name: "Records" }), "Transfer");

    await expect(canvas.queryByRole("combobox", { name: "Category" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("This field is required.")).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();

    await chooseOption(canvas.getByRole("combobox", { name: "To account" }), savingsAccount.name);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const SwitchesATransferToAnIncome: Story = {
  args: { bill: transferBill },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await chooseOption(canvas.getByRole("combobox", { name: "Records" }), "Income");

    await expect(canvas.queryByRole("combobox", { name: "To account" })).toBeNull();
    await expect(canvas.getByRole("combobox", { name: "Category" })).toBeVisible();

    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const NoAccountsOrCategories: Story = { args: { accounts: [], categories: [] } };

export const InvalidValues: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "0" } });
    await fireEvent.change(canvas.getByLabelText("Remind days before"), {
      target: { value: "400" },
    });
    await fireEvent.change(canvas.getByLabelText("Name"), { target: { value: " " } });

    await expect(await canvas.findByText(/Enter an amount greater than 0/u)).toBeVisible();
    await expect(canvas.getByText("Enter a whole number from 0 to 365.")).toBeVisible();
    await expect(canvas.getByText("This field is required.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const ChangesEverything: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Name"), {
      target: { value: "Telia internetas" },
    });
    await chooseOption(canvas.getByRole("combobox", { name: "Kind" }), "Variable amount");
    await expect(canvas.queryByLabelText("Amount")).toBeNull();
    await chooseOption(canvas.getByRole("combobox", { name: "Repeats" }), "Quarterly");
    await chooseOption(canvas.getByRole("combobox", { name: "Category" }), "No category");
    await chooseOption(canvas.getByRole("combobox", { name: "Account" }), "No default account");
    await fireEvent.change(canvas.getByLabelText("Remind days before"), { target: { value: "7" } });
    await userEvent.click(canvas.getByRole("checkbox", { name: "Active" }));
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const SavePending: Story = {
  parameters: withHandlers(getUpdateRecurringBillMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const save = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(save);

    await waitFor(() => expect(save).toHaveAttribute("aria-busy", "true"));
  },
};

export const ServerFieldError: Story = {
  parameters: withHandlers(getUpdateRecurringBillMockHandler(failWith(billCategoryProblem))),
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await expect(await canvas.findByText("Choose a category of the matching type.")).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "Category" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const BillNoLongerExists: Story = {
  parameters: withHandlers(getUpdateRecurringBillMockHandler(failWith(notFoundProblem))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
