import type { Meta, StoryObj } from "@storybook/react-vite";
import { ids } from "@/storybook/fixtures";
import { ImportResultLine } from "./import-result";

const result = {
  imported: 6,
  skipped: 0,
  accountId: ids.accounts.checking,
  dateFrom: "2026-09-10",
  dateTo: "2026-09-18",
};

const meta = {
  title: "Features/Imports/ImportResultLine",
  component: ImportResultLine,
  args: { result },
} satisfies Meta<typeof ImportResultLine>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleRow: Story = { args: { result: { ...result, imported: 1 } } };

export const WithSkippedDuplicates: Story = { args: { result: { ...result, skipped: 2 } } };

export const OnlyDuplicates: Story = { args: { result: { ...result, imported: 0, skipped: 3 } } };
