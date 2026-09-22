import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateBudgetMockHandler } from "@/api/generated/budgets/budgets.msw";
import { withWidth } from "@/storybook/decorators";
import {
  budgets,
  categories,
  incomeCategories,
  overLimitBudget,
  validationProblem,
  weeklyRolloverBudget,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { CreateBudgetForm } from "./create-budget-form";

const meta = {
  title: "Features/Budgets/CreateBudgetForm",
  component: CreateBudgetForm,
  args: { categories, onCreated: fn(), onCancel: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof CreateBudgetForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Edit: Story = { args: { initial: budgets[2] } };

export const EditWeeklyWithRollover: Story = {
  args: { initial: weeklyRolloverBudget },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("checkbox", { name: /carry|perkelti/i })).toBeChecked();
    await expect(canvas.getByRole("combobox", { name: /period|laikotarpis/i })).toHaveTextContent(
      /weekly|savaitinis/i,
    );
  },
};

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
  parameters: withHandlers(getCreateBudgetMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByRole("textbox"), { target: { value: "250.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /add budget|pridėti biudžetą/i }));
  },
};

export const ServerFieldError: Story = {
  parameters: withHandlers(
    getCreateBudgetMockHandler(
      failWith(
        {
          ...validationProblem,
          instance: "/api/budgets",
          errors: [
            {
              name: "limitAmount",
              reason: "Limit must be a decimal greater than 0.",
              code: "money.positive",
            },
          ],
        },
        400,
      ),
    ),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const limit = canvas.getByRole("textbox");
    await fireEvent.change(limit, { target: { value: "250.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /add budget|pridėti biudžetą/i }));

    const message = await canvas.findByText("Enter an amount greater than 0, e.g. 12.34.");
    await expect(message).toHaveAttribute("id", "budget-limit-error");
    await expect(limit).toHaveAttribute("aria-invalid", "true");
    await expect(limit).toHaveAttribute("aria-describedby", "budget-limit-error");
    await expect(canvas.queryByRole("alert")).toBeNull();

    await fireEvent.change(limit, { target: { value: "260.00" } });
    await expect(limit).toHaveAttribute("aria-invalid", "false");
  },
};
