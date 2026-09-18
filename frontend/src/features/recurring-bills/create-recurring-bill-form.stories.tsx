import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { accounts, categories } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { CreateRecurringBillForm } from "./create-recurring-bill-form";

const meta = {
  title: "Features/RecurringBills/CreateRecurringBillForm",
  component: CreateRecurringBillForm,
  args: { accounts, categories, onCreated: fn(), onCancel: fn() },
  decorators: [
    function withFormWidth(Story) {
      return (
        <div className="w-[min(36rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof CreateRecurringBillForm>;

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
      handlers: [
        http.post("*/api/recurring-bills", async () => {
          await delay("infinite");
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const [name, amount] = canvas.getAllByRole("textbox");
    fireEvent.change(name!, { target: { value: "Netflix" } });
    fireEvent.change(amount!, { target: { value: "13.99" } });
    await userEvent.click(
      canvas.getByRole("button", { name: /add recurring bill|pridėti periodinę/i }),
    );
  },
};
