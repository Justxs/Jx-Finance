import type { Meta, StoryObj } from "@storybook/react-vite";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateRecurringBillMockHandler } from "@/api/generated/recurring-bills/recurring-bills.msw";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories } from "@/storybook/fixtures";
import { handlers, pending } from "@/storybook/handlers";
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
  parameters: {
    msw: {
      handlers: [getCreateRecurringBillMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, amount] = canvas.getAllByRole("textbox");
    await fireEvent.change(name!, { target: { value: "Netflix" } });
    await fireEvent.change(amount!, { target: { value: "13.99" } });
    await userEvent.click(
      canvas.getByRole("button", { name: /add recurring bill|pridėti periodinę/i }),
    );
  },
};
