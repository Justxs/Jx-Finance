import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Rows } from "@/components/ui/rows/rows";
import {
  budgets,
  familyHousehold,
  overLimitBudget,
  weeklyRolloverBudget,
} from "@/storybook/fixtures";
import { BudgetRow } from "./budget-row";

const meta = {
  title: "Features/Budgets/BudgetRow",
  component: BudgetRow,
  args: {
    budget: budgets[2]!,
    onEdit: fn(),
    onDelete: fn(),
    deletePending: false,
    deleteDisabled: false,
  },
  parameters: { route: "/budgets" },
  decorators: [
    function withList(Story) {
      return (
        <Rows className="w-[min(48rem,calc(100vw-3rem))]">
          <Story />
        </Rows>
      );
    },
  ],
} satisfies Meta<typeof BudgetRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/ left$/u)).not.toHaveClass("text-expense");
    await expect(canvas.getByRole("meter")).toBeVisible();
  },
};

export const OverLimit: Story = {
  args: { budget: overLimitBudget },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/ over$/u)).toHaveClass("text-expense");
  },
};

export const WithRollover: Story = {
  args: { budget: weeklyRolloverBudget },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/carried/u)).toBeVisible();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const EditRequested: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: /^(edit|redaguoti):/i }));
    await expect(args.onEdit).toHaveBeenCalledOnce();
  },
};

export const SharedWithHousehold: Story = {
  args: { budget: { ...budgets[2]!, scope: "shared", householdId: familyHousehold.id } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Shared · Kazlauskų šeima")).toBeVisible();
  },
};

export const HugeAmountsLongName: Story = {
  args: {
    budget: {
      ...weeklyRolloverBudget,
      name: "Namo statybos ir apdailos darbai, įskaitant langų, durų, stogo dangos ir šildymo sistemos įrengimą",
      limitAmount: "1234567890.12",
      carriedAmount: "98765432.10",
      effectiveLimit: "1333333322.22",
      spent: "987654321.09",
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/ left$/u).parentElement).not.toHaveClass("whitespace-nowrap");
    await expect(canvas.getByRole("link", { name: /^Namo statybos/u })).toBeVisible();
  },
};
