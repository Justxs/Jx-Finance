import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { expect, userEvent, within } from "storybook/test";
import {
  accounts,
  categories,
  ids,
  importPreviewRows,
  tags,
  transactions,
} from "@/storybook/fixtures";
import { first } from "@/storybook/interactions";
import { ImportPreviewTable } from "./import-preview-table";
import { type PreviewRowState, toPreviewRows } from "./preview-rows";

interface HarnessProps {
  rows?: PreviewRowState[];
  confirmPending?: boolean;
  withCategories?: boolean;
}

const defaultRows: PreviewRowState[] = toPreviewRows(importPreviewRows, [], categories);

const recalledRows: PreviewRowState[] = toPreviewRows(importPreviewRows, transactions, categories);

const duplicateRows = defaultRows.map((row) => ({ ...row, isDuplicate: true, selected: false }));

const transferRows = defaultRows.map((row) =>
  row.looksLikeTransfer
    ? {
        ...row,
        selected: true,
        transferAccountId: row.type === "income" ? ids.accounts.savings : ids.accounts.shared,
      }
    : row,
);

const matchedRows: PreviewRowState[] = toPreviewRows(
  importPreviewRows.map((row) =>
    row.payee === "TRAFI UAB"
      ? {
          ...row,
          matchedTransaction: {
            id: ids.transactions.uncategorised,
            date: "2026-09-16",
            description: "Trafi monthly pass",
            categoryId: ids.categories.transport,
          },
        }
      : row,
  ),
  [],
  categories,
);

const learnedRows: PreviewRowState[] = toPreviewRows(
  importPreviewRows.map((row) =>
    row.payee === "IGNITIS, UAB"
      ? {
          ...row,
          suggestedCategoryId: null,
          suggestedTagIds: [],
          matchedRuleName: null,
          learnedCategoryId: ids.categories.utilities,
          learnedConfidence: 0.93,
        }
      : row,
  ),
  [],
  categories,
);

const manyRows: PreviewRowState[] = Array.from({ length: 5 }, (_, batch) =>
  defaultRows.map((row, index) => ({
    ...row,
    importRef: `20260918${String(batch * defaultRows.length + index).padStart(8, "0")}`,
  })),
).flat();

function PreviewTableHarness({
  rows: initialRows = defaultRows,
  confirmPending = false,
  withCategories = true,
}: Readonly<HarnessProps>) {
  const [rows, setRows] = useState(initialRows);

  function handleRowChange(index: number, patch: Partial<PreviewRowState>) {
    setRows((previous) => previous.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-6">
      <ImportPreviewTable
        rows={rows}
        accountId={ids.accounts.checking}
        accounts={accounts}
        categories={withCategories ? categories : []}
        tags={tags}
        onRowChange={handleRowChange}
        onRowsChange={setRows}
        onCancel={() => toast.message("Cancelled")}
        onConfirm={() =>
          toast.success(`Confirmed ${rows.filter((row) => row.selected).length} rows`)
        }
        confirmPending={confirmPending}
      />
    </div>
  );
}

const meta = {
  title: "Features/Imports/ImportPreviewTable",
  component: PreviewTableHarness,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof PreviewTableHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSuggestedCategories: Story = { args: { rows: recalledRows } };

export const IncomeOnlySelected: Story = {
  args: { rows: defaultRows.map((row) => ({ ...row, selected: row.type === "income" })) },
};

export const Empty: Story = { args: { rows: [] } };

export const AllDuplicates: Story = { args: { rows: duplicateRows } };

export const TransfersAssigned: Story = { args: { rows: transferRows } };

export const NothingSelected: Story = {
  args: { rows: defaultRows.map((row) => ({ ...row, selected: false })) },
};

export const MatchesHandEnteredEntry: Story = {
  args: { rows: matchedRows },
  play: async ({ canvas }) => {
    const table = within(first(canvas.getAllByRole("region", { name: "Preview" })));
    await expect(table.getByText("Matches your entry")).toBeVisible();
    await expect(table.getByRole("combobox", { name: /^Category: .*TRAFI UAB/ })).toBeDisabled();
  },
};

export const LearnedCategory: Story = {
  args: { rows: learnedRows },
  play: async ({ canvas }) => {
    const table = within(first(canvas.getAllByRole("region", { name: "Preview" })));
    await expect(table.getByText("Learned")).toBeVisible();
    await expect(table.getByText("Filled by a rule")).toBeVisible();
  },
};

export const ManyRows: Story = { args: { rows: manyRows } };

export const NoCategories: Story = { args: { withCategories: false } };

export const ConfirmPending: Story = { args: { confirmPending: true } };

export const TransfersView: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: /^Transfers/ }));
    await expect(canvas.getByRole("radio", { name: /^Transfers/ })).toBeChecked();
    const table = within(first(canvas.getAllByRole("region", { name: "Preview" })));
    await expect(table.getByText("Šarūnas Kazlauskas")).toBeVisible();
    await expect(table.queryByText("VALSTYBINĖ MOKESČIŲ INSPEKCIJA")).not.toBeInTheDocument();
  },
};

export const SearchingDescriptions: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByRole("searchbox", { name: "Search descriptions" }), "gpm");
    const table = within(first(canvas.getAllByRole("region", { name: "Preview" })));
    await expect(table.getByText("VALSTYBINĖ MOKESČIŲ INSPEKCIJA")).toBeVisible();
    await expect(table.queryByText("Šarūnas Kazlauskas")).not.toBeInTheDocument();
  },
};

export const EmptyView: Story = {
  args: { rows: recalledRows.map((row) => ({ ...row, isDuplicate: false })) },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole("radio", { name: /^Duplicates/ }));
    await expect(canvas.getByText("No rows match this view.")).toBeVisible();
  },
};
