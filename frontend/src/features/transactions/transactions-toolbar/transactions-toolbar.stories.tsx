import type { Meta, StoryObj } from "@storybook/react-vite";
import { useSearch } from "@tanstack/react-router";
import { expect, fn, userEvent, within } from "storybook/test";
import { getExportTransactionsPdfUrl, getExportTransactionsUrl } from "@/api/generated";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { transactionFilterParams } from "@/features/transactions/transaction-queries";
import { useTransactionFilters } from "@/features/transactions/use-transaction-filters";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, settingsWith, tags } from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { TransactionsToolbar } from "./transactions-toolbar";

interface HarnessProps {
  exportUrl: string;
  exportPdfUrl: string;
  onUseTemplate: () => void;
}

function ToolbarHarness(props: Readonly<HarnessProps>) {
  const filters = useTransactionFilters({ accounts, categories });
  const filterParams = transactionFilterParams(useSearch({ from: "/transactions" }));
  return (
    <TransactionsToolbar
      filters={filters}
      filterParams={filterParams}
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

export const SuggestCategories: Story = {
  parameters: {
    route: "/transactions?uncategorized=true",
    ...withHandlers(
      getSettingsMockHandler(settingsWith({ features: { learnedCategories: true } })),
    ),
  },
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Suggest categories" }));
    const dialog = within(await openedDialog());
    await expect(await dialog.findByText('by rule "Bolt Food"')).toBeVisible();
  },
};
