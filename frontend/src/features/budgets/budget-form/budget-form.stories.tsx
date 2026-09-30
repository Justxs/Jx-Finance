import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import {
  getBudgetSuggestionsMockHandler,
  getCreateBudgetMockHandler,
} from "@/api/generated/budgets/budgets.msw";
import { withWidth } from "@/storybook/decorators";
import {
  budgets,
  categories,
  familyHousehold,
  incomeCategories,
  overLimitBudget,
  holidayTagBudget,
  problemOf,
  tags,
  weeklyRolloverBudget,
  youngBudgetSuggestions,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { BudgetForm } from "./budget-form";

const meta = {
  title: "Features/Budgets/BudgetForm",
  component: BudgetForm,
  args: { categories, tags, onClose: fn() },
  decorators: [withWidth("form")],
} satisfies Meta<typeof BudgetForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const periodSelect = /^(period|periodiškumas)$/i;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("textbox")).toHaveValue("312.00");
    await expect(canvas.getByText("Median of the last 6 months: €311.20")).toBeVisible();
    await expect(
      canvas.getByText("Oldest first: €310.00 · €295.00 · €320.00 · €305.00 · €330.00 · €312.40"),
    ).toBeVisible();
    await expect(canvas.getByRole("textbox")).toHaveAccessibleDescription(
      /median of the last 6 months/i,
    );
  },
};

export const LimitOnATag: Story = {
  parameters: withHandlers(getCreateBudgetMockHandler(async () => holidayTagBudget)),
  play: async ({ canvas, args }) => {
    await userEvent.click(await canvas.findByRole("radio", { name: "Tag" }));
    await expect(canvas.getByRole("combobox", { name: "Tag" })).toBeVisible();
    await expect(canvas.queryByRole("combobox", { name: /^category$/i })).not.toBeInTheDocument();
    await expect(canvas.getByText(/Every expense with this tag counts in full/u)).toBeVisible();
    await fireEvent.change(canvas.getByRole("textbox"), { target: { value: "2000" } });
    await userEvent.click(canvas.getByRole("button", { name: "Add budget" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalledTimes(1));
  },
};

export const EditingATagBudget: Story = {
  args: { initial: holidayTagBudget },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("radio", { name: "Tag" })).toBeChecked();
    await expect(canvas.getByRole("combobox", { name: "Tag" })).toHaveTextContent("Atostogos 2026");
  },
};

export const WithoutTags: Story = {
  args: { tags: [] },
  play: async ({ canvas }) => {
    await canvas.findByRole("textbox");
    await expect(canvas.queryByRole("radio", { name: "Tag" })).not.toBeInTheDocument();
  },
};

export const PeriodChangeRefills: Story = {
  play: async ({ canvas }) => {
    const limit = await canvas.findByRole("textbox");
    await chooseOption(canvas.getByRole("combobox", { name: periodSelect }), /^weekly$/i);
    await waitFor(() => expect(limit).toHaveValue("74.00"));
    await expect(canvas.getByText("Median of the last 6 weeks: €73.15")).toBeVisible();
    await chooseOption(canvas.getByRole("combobox", { name: /^category$/i }), "Būstas");
    await waitFor(() => expect(limit).toHaveValue(""));
    await expect(canvas.getByText("Not enough history yet")).toBeVisible();
  },
};

export const TypedLimitSurvivesPeriodChange: Story = {
  play: async ({ canvas }) => {
    const limit = await canvas.findByRole("textbox");
    await fireEvent.change(limit, { target: { value: "250.00" } });
    await chooseOption(canvas.getByRole("combobox", { name: periodSelect }), /^weekly$/i);
    await canvas.findByText("Median of the last 6 weeks: €73.15");
    await expect(limit).toHaveValue("250.00");
  },
};

export const NotEnoughHistory: Story = {
  parameters: withHandlers(getBudgetSuggestionsMockHandler(youngBudgetSuggestions)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Not enough history yet")).toBeVisible();
    await expect(canvas.getByRole("textbox")).toHaveValue("");
  },
};

export const EditShowsHistory: Story = {
  args: { initial: overLimitBudget },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Median of the last 6 months: €311.20")).toBeVisible();
    await expect(canvas.getByRole("textbox")).toHaveValue("150.00");
  },
};

export const Edit: Story = { args: { initial: budgets[2] } };

export const EditWeeklyWithRollover: Story = {
  args: { initial: weeklyRolloverBudget },
  play: async ({ canvas }) => {
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
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("textbox"), "-5,5x");
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateBudgetMockHandler(pending)),
  play: async ({ canvas }) => {
    await fireEvent.change(canvas.getByRole("textbox"), { target: { value: "250.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /add budget|pridėti biudžetą/i }));
  },
};

export const ServerFieldError: Story = {
  parameters: withHandlers(
    getCreateBudgetMockHandler(
      failWith(
        problemOf(400, "money.positive", "Limit must be a decimal greater than 0.", {
          name: "limitAmount",
          instance: "/api/budgets",
        }),
      ),
    ),
  ),
  play: async ({ canvas }) => {
    const limit = canvas.getByRole("textbox");
    await fireEvent.change(limit, { target: { value: "250.00" } });
    await userEvent.click(canvas.getByRole("button", { name: /add budget|pridėti biudžetą/i }));

    const message = await canvas.findByText("Enter an amount greater than 0, e.g. 12.34.");
    await expect(message).toHaveAttribute("id", "budget-limit-error");
    await expect(limit).toHaveAttribute("aria-invalid", "true");
    await expect(limit).toHaveAttribute("aria-describedby", "budget-limit-hint budget-limit-error");
    await expect(canvas.queryByRole("alert")).toBeNull();

    await fireEvent.change(limit, { target: { value: "260.00" } });
    await expect(limit).toHaveAttribute("aria-invalid", "false");
    await expect(message).not.toBeInTheDocument();
  },
};

export const EditingShared: Story = {
  args: { initial: { ...budgets[2]!, scope: "shared", householdId: familyHousehold.id } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("combobox", { name: "Visibility" })).toHaveTextContent(
      "Shared",
    );
    await expect(canvas.getByRole("combobox", { name: "Household" })).toHaveTextContent(
      familyHousehold.name,
    );
  },
};
