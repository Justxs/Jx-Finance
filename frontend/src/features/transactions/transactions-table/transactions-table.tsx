import { useTable } from "@tanstack/react-table";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip } from "@/components/ui/tooltip";
import { isOptimistic } from "../transaction-amount";
import { transactionTableFeatures } from "./table-features";
import {
  isSelectableTransaction,
  type TransactionSelection,
  type useTransactionColumns,
} from "./use-transaction-columns";

const columnClass: Record<string, string> = {
  select: "w-10 pr-0",
  date: "w-27",
  categoryId: "w-36",
  accountId: "w-36",
  amount: "w-30 text-right",
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
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columnCount} className="py-6 whitespace-normal text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("transactions.empty")}
        </TableCell>
      </TableRow>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        className={isOptimistic(row.original) ? "is-stale" : undefined}
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
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={t("transactions.title")}
          tabIndex={0}
        >
          <Table
            className={`table-fixed ${selection ? "min-w-184" : "min-w-176"} ${
              isPlaceholder ? "is-stale" : ""
            }`}
            aria-busy={isPlaceholder}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {selection ? (
                    <TableHead className={columnClass.select}>
                      <SelectPageCheckbox selection={selection} />
                    </TableHead>
                  ) : null}
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={columnClass[header.column.id]}
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
        </div>
      </div>
    </ViewTransition>
  );
}
