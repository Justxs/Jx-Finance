import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { differingReconciliation, ids, matchedReconciliation } from "@/storybook/fixtures";
import { ImportResultLine } from "./import-result";

const result = {
  imported: 6,
  linked: 0,
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

export const WithLinkedEntries: Story = { args: { result: { ...result, linked: 2 } } };

export const OnlyDuplicates: Story = { args: { result: { ...result, imported: 0, skipped: 3 } } };

export const StatementMatches: Story = {
  args: {
    result: { ...result, reconciliation: { ...matchedReconciliation, source: "statement" } },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/^Balance matches the statement on/)).toBeVisible();
  },
};

export const StatementDiffers: Story = {
  args: { result: { ...result, reconciliation: differingReconciliation } },
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/^The statement differs by €12.30 on/)).toHaveClass(
      "text-expense",
    );
  },
};
