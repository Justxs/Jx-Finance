import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { TRANSACTIONS_EXPORT_CSV_PATH, TRANSACTIONS_EXPORT_PDF_PATH } from "@/lib/export-url";
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
    exportUrl: TRANSACTIONS_EXPORT_CSV_PATH,
    exportPdfUrl: TRANSACTIONS_EXPORT_PDF_PATH,
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
    exportUrl: `${TRANSACTIONS_EXPORT_CSV_PATH}?type=expense`,
    exportPdfUrl: `${TRANSACTIONS_EXPORT_PDF_PATH}?type=expense`,
  },
};

export const Narrow: Story = {
  args: { filtered: true },
  decorators: [withWidth("w-56")],
};
