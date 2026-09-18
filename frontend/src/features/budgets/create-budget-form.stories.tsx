import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http } from "msw";
import { fireEvent, fn, userEvent, within } from "storybook/test";
import { budgets, categories, incomeCategories, overLimitBudget } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { CreateBudgetForm } from "./create-budget-form";

const meta = {
  title: "Features/Budgets/CreateBudgetForm",
  component: CreateBudgetForm,
  args: { categories, onCreated: fn(), onCancel: fn() },
  decorators: [
    function withFormWidth(Story) {
      return (
        <div className="w-[min(32rem,calc(100vw-3rem))]">
          <Story />
        </div>
      );
    },
  ],
} satisfies Meta<typeof CreateBudgetForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Edit: Story = { args: { initial: budgets[1] } };

export const EditOverLimit: Story = { args: { initial: overLimitBudget } };

export const NoExpenseCategories: Story = { args: { categories: incomeCategories } };

export const NoCategories: Story = { args: { categories: [] } };

export const ValidationError: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByRole("textbox"), "-5,5x");
  },
};

export const SubmitPending: Story = {
  parameters: {
    msw: {
      handlers: [
        http.post("*/api/budgets", async () => {
          await delay("infinite");
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("textbox"), { target: { value: "250.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /add budget|pridėti biudžetą/i }));
  },
};
