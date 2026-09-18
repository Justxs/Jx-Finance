import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TransactionsToolbar } from "./transactions-toolbar";

const meta = {
  title: "Features/Transactions/TransactionsToolbar",
  component: TransactionsToolbar,
  args: {
    exportUrl: "/api/transactions/export",
    exportPdfUrl: "/api/transactions/export/pdf",
    filtered: false,
    onClearFilters: fn(),
  },
  render: (args) => (
    <div className="w-[min(48rem,90vw)]">
      <TransactionsToolbar {...args} />
    </div>
  ),
} satisfies Meta<typeof TransactionsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    filtered: true,
    exportUrl: "/api/transactions/export?type=expense",
    exportPdfUrl: "/api/transactions/export/pdf?type=expense",
  },
};

export const Narrow: Story = {
  args: { filtered: true },
  render: (args) => (
    <div className="w-56">
      <TransactionsToolbar {...args} />
    </div>
  ),
};
