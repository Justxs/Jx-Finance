import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
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
  decorators: [withWidth("w-[min(56rem,92vw)]")],
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
  decorators: [withWidth("card")],
};
