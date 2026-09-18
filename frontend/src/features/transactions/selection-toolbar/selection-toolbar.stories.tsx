import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { categories, transactions } from "@/storybook/fixtures";
import { SelectionToolbar } from "./selection-toolbar";

const expenses = transactions.filter((item) => item.type === "expense" && !item.isSplit);
const incomes = transactions.filter((item) => item.type === "income" && !item.isSplit);

const meta = {
  title: "Features/Transactions/SelectionToolbar",
  component: SelectionToolbar,
  args: {
    selected: expenses.slice(0, 3),
    categories,
    pending: false,
    onApply: fn(),
    onClear: fn(),
  },
  render: (args) => (
    <div className="w-[min(56rem,92vw)]">
      <SelectionToolbar {...args} />
    </div>
  ),
} satisfies Meta<typeof SelectionToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneType: Story = {};

export const IncomeOnly: Story = { args: { selected: incomes.slice(0, 1) } };

export const MixedTypes: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
};

export const Pending: Story = { args: { pending: true } };

export const Narrow: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
  render: (args) => (
    <div className="w-80">
      <SelectionToolbar {...args} />
    </div>
  ),
};
