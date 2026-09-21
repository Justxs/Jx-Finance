import { useTable } from "@tanstack/react-table";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollRegion,
  TableEmptyRow,
} from "@/components/ui/table/table";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { cn } from "@/lib/utils";
import { isOptimistic } from "../transaction-amount";
import { transactionTableFeatures } from "./table-features";
import {
  isSelectableTransaction,
  type TransactionSelection,
  type useTransactionColumns,
} from "./use-transaction-columns";

const columnWidth: Record<string, string> = {
  date: "w-27",
  categoryId: "w-36",
  tagIds: "w-36",
  accountId: "w-36",
  amount: "w-30",
  actions: "w-24",
};

interface Props {
  data: TransactionResponse[];
  columns: ReturnType<typeof useTransactionColumns>;
  isPlaceholder: boolean;
  columnFilters: Record<string, ReactNode>;
  columnAriaSort?: Record<string, "ascending" | "descending" | undefined>;
  filtered: boolean;
  selection?: TransactionSelection;
}

interface SelectCellProps {
  row: TransactionResponse;
  selection: TransactionSelection;
}

function SelectCell({ row, selection }: Readonly<SelectCellProps>) {
  const { t } = useTranslation();
  const label = t("transactions.selectRow", { row: selection.rowLabel(row) });

  if (!isSelectableTransaction(row)) {
    const reason = row.isSplit ? t("transactions.splitNotSelectable") : undefined;
    return (
      <Tooltip content={reason}>
        <span className="inline-flex">
          <Checkbox aria-label={reason ? `${label}. ${reason}` : label} checked={false} disabled />
        </span>
      </Tooltip>
    );
  }

  const id = row.id;
  return (
    <Checkbox
      aria-label={label}
      checked={selection.selectedIds.has(id)}
      onCheckedChange={(next) => selection.onToggle(id, next)}
    />
  );
}

interface SelectPageProps {
  selection: TransactionSelection;
}

function SelectPageCheckbox({ selection }: Readonly<SelectPageProps>) {
  const { t } = useTranslation();
  const selectedCount = selection.selectableIds.filter((id) =>
    selection.selectedIds.has(id),
  ).length;
  const all = selectedCount > 0 && selectedCount === selection.selectableIds.length;

  return (
    <Tooltip content={t("transactions.selectPage")}>
      <Checkbox
        aria-label={t("transactions.selectPage")}
        checked={all}
        indeterminate={selectedCount > 0 && !all}
        disabled={selection.selectableIds.length === 0}
        onCheckedChange={(next) => selection.onTogglePage(next)}
      />
    </Tooltip>
  );
}

export function TransactionsTable({
  data,
  columns,
  isPlaceholder,
  columnFilters,
  columnAriaSort,
  filtered,
  selection,
}: Readonly<Props>) {
  "use no memo";
  const table = useTable({
    features: transactionTableFeatures,
    data,
    columns,
  });
  const { t } = useTranslation();
  const columnCount = table.getAllColumns().length + (selection ? 1 : 0);

  let body: ReactNode;
  if (table.getRowModel().rows.length === 0) {
    body = (
      <TableEmptyRow colSpan={columnCount} filtered={filtered}>
        {t("transactions.empty")}
      </TableEmptyRow>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        className={isOptimistic(row.original) ? "stale" : undefined}
        aria-busy={isOptimistic(row.original) || undefined}
        data-state={selection?.selectedIds.has(row.original.id) ? "selected" : undefined}
      >
        {selection ? (
          <TableCell className="pr-0">
            <SelectCell row={row.original} selection={selection} />
          </TableCell>
        ) : null}
        {row.getAllCells().map((cell) => (
          <TableCell key={cell.id} className="whitespace-normal">
            <table.FlexRender cell={cell} />
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  return (
    <ViewTransition name="transactions-rows" enter="none" exit="none">
      <div className="-mx-3">
        <ScrollRegion aria-label={t("transactions.title")}>
          <Table
            className={cn(
              "table-fixed",
              selection ? "min-w-220" : "min-w-212",
              isPlaceholder && "stale",
            )}
            aria-busy={isPlaceholder}
          >
            <colgroup>
              {selection ? <col className="w-10" /> : null}
              {table.getAllColumns().map((column) => (
                <col key={column.id} className={columnWidth[column.id]} />
              ))}
            </colgroup>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {selection ? (
                    <TableHead className="pr-0">
                      <SelectPageCheckbox selection={selection} />
                    </TableHead>
                  ) : null}
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={header.column.id === "amount" ? "text-right" : undefined}
                      aria-sort={columnAriaSort?.[header.column.id]}
                    >
                      {header.isPlaceholder
                        ? null
                        : (columnFilters[header.column.id] ?? <table.FlexRender header={header} />)}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>{body}</TableBody>
          </Table>
        </ScrollRegion>
      </div>
    </ViewTransition>
  );
}
