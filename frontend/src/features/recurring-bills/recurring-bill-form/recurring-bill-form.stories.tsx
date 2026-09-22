import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getCreateRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, checkingAccount, savingsAccount } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { RecurringBillForm } from "./recurring-bill-form";

const meta = {
  title: "Features/RecurringBills/RecurringBillForm",
  component: RecurringBillForm,
  args: { accounts, categories, onDone: fn(), onCancel: fn() },
  decorators: [withWidth("w-[min(36rem,calc(100vw-3rem))]")],
} satisfies Meta<typeof RecurringBillForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoAccounts: Story = { args: { accounts: [] } };

export const NoCategories: Story = { args: { categories: [] } };

export const ChooseIncomeShape: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseOption(canvas.getByRole("combobox", { name: "Records" }), "Income");

    await expect(canvas.getByRole("combobox", { name: "Category" })).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: "To account" })).toBeNull();
  },
};

export const ChooseTransferShape: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseOption(canvas.getByRole("combobox", { name: "Records" }), "Transfer");

    await expect(canvas.getByRole("combobox", { name: "From account" })).toBeVisible();
    await expect(canvas.getByRole("combobox", { name: "To account" })).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: "Category" })).toBeNull();
    await expect(canvas.getByText(/A transfer has no category/u)).toBeVisible();
  },
};

export const TransferNeedsTwoDifferentAccounts: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const [name, amount] = canvas.getAllByRole("textbox");
    await fireEvent.change(name!, { target: { value: "Standing order" } });
    await fireEvent.change(amount!, { target: { value: "250.00" } });
    await chooseOption(canvas.getByRole("combobox", { name: "Records" }), "Transfer");
    await chooseOption(
      canvas.getByRole("combobox", { name: "From account" }),
      checkingAccount.name,
    );
    await chooseOption(canvas.getByRole("combobox", { name: "To account" }), checkingAccount.name);
    await userEvent.click(
      canvas.getByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );

    await expect(
      await canvas.findByText("Source and destination accounts must differ."),
    ).toBeVisible();
    await expect(args.onDone).not.toHaveBeenCalled();

    await chooseOption(canvas.getByRole("combobox", { name: "To account" }), savingsAccount.name);
    await userEvent.click(
      canvas.getByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );

    await waitFor(() => expect(args.onDone).toHaveBeenCalled());
  },
};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, amount] = canvas.getAllByRole("textbox");
    await userEvent.type(name!, "Telia mobile and home internet");
    await userEvent.type(amount!, "24.99");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, amount] = canvas.getAllByRole("textbox");
    await userEvent.type(name!, "x");
    await userEvent.clear(name!);
    await userEvent.type(amount!, "-1");
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateRecurringBillMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, amount] = canvas.getAllByRole("textbox");
    await fireEvent.change(name!, { target: { value: "Netflix" } });
    await fireEvent.change(amount!, { target: { value: "13.99" } });
    await userEvent.click(
      canvas.getByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );
  },
};
