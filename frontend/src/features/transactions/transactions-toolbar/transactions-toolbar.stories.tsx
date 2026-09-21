import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, tags } from "@/storybook/fixtures";
import { TransactionsToolbar } from "./transactions-toolbar";

const meta = {
  title: "Features/Transactions/TransactionsToolbar",
  component: TransactionsToolbar,
  args: {
    accounts,
    categories,
    tags,
    exportUrl: "/api/transactions/export",
    exportPdfUrl: "/api/transactions/export/pdf",
    filtered: false,
    onClearFilters: fn(),
    onUseTemplate: fn(),
  },
  parameters: { route: "/transactions" },
  decorators: [withWidth("w-[min(48rem,90vw)]")],
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
  decorators: [withWidth("w-56")],
};
