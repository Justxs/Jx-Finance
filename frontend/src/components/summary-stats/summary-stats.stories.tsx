import type { Meta, StoryObj } from "@storybook/react-vite";
import { SummaryStats } from "./summary-stats";

const meta = {
  title: "Components/SummaryStats",
  component: SummaryStats,
  parameters: { layout: "padded" },
  args: {
    items: [
      { label: "Total balance", value: "12840.55" },
      { label: "Income this month", value: "2450", tone: "text-secondary" },
      { label: "Expenses this month", value: "1312.4", tone: "text-expense" },
    ],
  },
} satisfies Meta<typeof SummaryStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    items: [
      { label: "Total balance", value: undefined },
      { label: "Income this month", value: undefined },
      { label: "Expenses this month", value: undefined },
    ],
  },
};

export const SingleItem: Story = { args: { items: [{ label: "Net worth", value: "84210.07" }] } };

export const ZeroAndNegative: Story = {
  args: {
    items: [
      { label: "Balance", value: "0" },
      { label: "Net change", value: "-532.19", tone: "text-expense" },
    ],
  },
};

export const LongLabelsAndLargeValues: Story = {
  args: {
    items: [
      {
        label: "Total balance across every personal and shared household account",
        value: "123456789012.34",
      },
      { label: "Income", value: "9876543210.99", tone: "text-secondary" },
      { label: "Expenses", value: "8765432109.01", tone: "text-expense" },
      { label: "Savings", value: "1111111101.98" },
      { label: "Transfers", value: "42" },
    ],
  },
};
