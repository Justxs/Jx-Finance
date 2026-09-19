import type { Meta, StoryObj } from "@storybook/react-vite";
import { budgets, overLimitBudget } from "@/storybook/fixtures";
import { BudgetUsageChart } from "./budget-usage-chart";

const meta = {
  title: "Features/Budgets/BudgetUsageChart",
  component: BudgetUsageChart,
  decorators: [
    (Story) => (
      <div className="w-[min(40rem,90vw)]">
        <Story />
      </div>
    ),
  ],
  args: { budgets },
} satisfies Meta<typeof BudgetUsageChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OverLimit: Story = { args: { budgets: [overLimitBudget, ...budgets.slice(0, 1)] } };

export const NothingSpent: Story = {
  args: { budgets: budgets.map((budget) => ({ ...budget, spent: "0.00" })) },
};
