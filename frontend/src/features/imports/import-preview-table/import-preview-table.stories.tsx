import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { toast } from "sonner";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  accounts,
  categories,
  ids,
  importPreviewRows,
  tags,
  transactionGroups,
  transactions,
} from "@/storybook/fixtures";
import { type Canvas, chooseOption, first } from "@/storybook/interactions";
import { ImportPreviewTable } from "./import-preview-table";
import { type PreviewRowState, toPreviewRows } from "./preview-rows";

interface HarnessProps {
  rows?: PreviewRowState[];
  confirmPending?: boolean;
  withCategories?: boolean;
}

const confirmed = fn();

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
        groups={transactionGroups}
        onRowChange={handleRowChange}
        onRowsChange={setRows}
        onCancel={() => toast.message("Cancelled")}
        onConfirm={(group) => {
          confirmed(group);
          toast.success(`Confirmed ${rows.filter((row) => row.selected).length} rows`);
        }}
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

function previewTable(canvas: Canvas) {
  return within(first(canvas.getAllByRole("region", { name: "Preview" })));
}

export const PurposeTextUnderPayee: Story = {
  play: async ({ canvas }) => {
    const table = previewTable(canvas);
    await expect(table.getByText("Rūta Kazlauskienė")).toHaveClass("font-medium");
    const purpose = table.getByText("Pervedimas į taupomąją sąskaitą LT647044001231465456");
    await expect(purpose).toHaveClass("text-xs", "text-muted-foreground", "truncate");
    await expect(purpose).toHaveAttribute(
      "title",
      "Pervedimas į taupomąją sąskaitą LT647044001231465456",
    );
    await expect(table.getByText("VALSTYBINĖ MOKESČIŲ INSPEKCIJA")).toBeVisible();
    await expect(table.getByText("GPM permokos grąžinimas")).toBeVisible();
  },
};

export const FlagsInTheDescriptionCell: Story = {
  play: async ({ canvas }) => {
    const table = previewTable(canvas);
    await expect(table.queryByRole("columnheader", { name: "Status" })).not.toBeInTheDocument();
    const cell = table.getByText("Rūta Kazlauskienė").closest("td");
    await expect(cell).toHaveTextContent("Looks like a transfer");
    await expect(table.getByText("LIDL LIETUVA UAB").closest("td")).toHaveTextContent(
      "Unusual amount",
    );
  },
};

export const DuplicateRowsAreLocked: Story = {
  play: async ({ canvas }) => {
    const table = previewTable(canvas);
    await expect(table.getByRole("checkbox", { name: /^Select: .*MAXIMA/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(table.getByRole("combobox", { name: /^Category: .*MAXIMA/ })).toBeDisabled();
    await expect(
      table.queryByRole("button", { name: /^More options: .*MAXIMA/ }),
    ).not.toBeInTheDocument();
    await expect(table.getByText("MAXIMA LT, UAB").closest("tr")).toHaveClass(
      "text-muted-foreground",
    );
  },
};

export const MarkAsTransferFromMore: Story = {
  play: async ({ canvas }) => {
    const table = previewTable(canvas);
    await userEvent.click(table.getByRole("button", { name: /^More options: .*LIDL/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Mark as transfer" }));
    await expect(
      await table.findByRole("combobox", { name: /^Record as: .*LIDL/ }),
    ).toHaveTextContent("Income / expense");
  },
};

export const TagARow: Story = {
  play: async ({ canvas }) => {
    const table = previewTable(canvas);
    const tag = first(tags);
    await userEvent.click(table.getByRole("button", { name: /^More options: .*LIDL/ }));
    await userEvent.click(await screen.findByRole("checkbox", { name: tag.name }));
    await expect(table.getByText("LIDL LIETUVA UAB").closest("td")).toHaveTextContent(tag.name);
  },
};

export const SpreadARow: Story = {
  play: async ({ canvas }) => {
    const table = previewTable(canvas);
    await userEvent.click(table.getByRole("button", { name: /^More options: .*LIDL/ }));
    await chooseOption(await screen.findByRole("combobox", { name: "Spread over" }), "12 months");
    await chooseOption(
      await screen.findByRole("combobox", { name: "Months counted" }),
      "Up to the date's month",
    );

    await expect(screen.getByRole("combobox", { name: "Spread over" })).toHaveTextContent(
      "12 months",
    );
    await expect(screen.getByRole("combobox", { name: "Months counted" })).toHaveTextContent(
      "Up to the date's month",
    );
    await expect(table.getByText("LIDL LIETUVA UAB").closest("td")).toHaveTextContent(
      "Spread · 12 months",
    );
  },
};

export const GroupingTheSelectedRows: Story = {
  play: async ({ canvas }) => {
    const group = first(transactionGroups);
    await chooseOption(
      canvas.getByRole("combobox", { name: "Put the selected rows in a group" }),
      group.name,
    );
    await userEvent.click(canvas.getByRole("button", { name: /^Import \d+ rows?$/ }));
    await waitFor(() => expect(confirmed).toHaveBeenCalledWith({ id: group.id, name: null }));
  },
};

export const NamingANewGroup: Story = {
  play: async ({ canvas }) => {
    await chooseOption(
      canvas.getByRole("combobox", { name: "Put the selected rows in a group" }),
      "New group",
    );
    const confirm = canvas.getByRole("button", { name: /^Import \d+ rows?$/ });
    await expect(confirm).toBeDisabled();
    await userEvent.type(canvas.getByRole("textbox", { name: "Group name" }), "Kelionė į Rygą");
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(confirmed).toHaveBeenCalledWith({ id: null, name: "Kelionė į Rygą" }),
    );
  },
};

export const ManyRows: Story = { args: { rows: manyRows } };

export const HugeAmounts: Story = {
  args: {
    rows: defaultRows.map((row, index) =>
      index === 0 ? { ...row, amount: "1234567890.12", currency: "eur" } : row,
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    const columns = [...canvasElement.querySelectorAll("col")].map((column) => column.className);
    await expect(columns).toContain("w-38");
    await expect(canvas.getByRole("table")).toHaveClass("min-w-208");
  },
};

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
