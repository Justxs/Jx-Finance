import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { getExportTransactionsPdfUrl, getExportTransactionsUrl } from "@/api/generated";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, tags } from "@/storybook/fixtures";
import { TransactionsToolbar } from "./transactions-toolbar";

interface HarnessProps {
  exportUrl: string;
  exportPdfUrl: string;
  onUseTemplate: () => void;
}

function ToolbarHarness(props: Readonly<HarnessProps>) {
  const filters = useTransactionFilters({ accounts, categories });
  return (
    <TransactionsToolbar
      filters={filters}
      accounts={accounts}
      categories={categories}
      tags={tags}
      {...props}
    />
  );
}

const meta = {
  title: "Features/Transactions/TransactionsToolbar",
  component: ToolbarHarness,
  args: {
    exportUrl: getExportTransactionsUrl({ page: 1, pageSize: 20 }),
    exportPdfUrl: getExportTransactionsPdfUrl({ page: 1, pageSize: 20 }),
    onUseTemplate: fn(),
  },
  parameters: { route: "/transactions" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof ToolbarHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filtered: Story = {
  args: {
    exportUrl: getExportTransactionsUrl({ page: 1, pageSize: 20, type: "expense" }),
    exportPdfUrl: getExportTransactionsPdfUrl({ page: 1, pageSize: 20, type: "expense" }),
  },
};

export const Narrow: Story = {
  decorators: [withWidth("w-56")],
};
