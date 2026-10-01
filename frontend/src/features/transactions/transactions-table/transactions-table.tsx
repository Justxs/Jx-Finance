import { useTable } from "@tanstack/react-table";
import { CornerDownRight } from "lucide-react";
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
import { GroupRow, GroupStatusRow } from "@/features/transactions/ledger-groups/group-row";
import { type LedgerRow, ledgerRowKey } from "@/features/transactions/ledger-groups/ledger-rows";
import type { LedgerGroupHandlers } from "@/features/transactions/ledger-groups/use-ledger-groups";
import { isOptimistic } from "@/features/transactions/transaction-amount/transaction-row";
import { cn } from "@/lib/utils";
import { transactionTableFeatures } from "./table-features";
import {
  isSelectableTransaction,
  type TransactionSelection,
  type useTransactionColumns,
} from "./use-transaction-columns";

const columnWidth: Record<string, string> = {
  date: "w-27",
  categoryId: "w-48",
  tagIds: "w-36",
  accountId: "w-36",
  amount: "w-30",
  actions: "w-32 pointer-coarse:w-41",
};

interface Props {
  rows: LedgerRow[];
  columns: ReturnType<typeof useTransactionColumns>;
  isPlaceholder: boolean;
  columnFilters: Record<string, ReactNode>;
  columnAriaSort?: Record<string, "ascending" | "descending" | undefined>;
  filtered: boolean;
  onClearFilters?: () => void;
  selection?: TransactionSelection;
  groups?: LedgerGroupHandlers;
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
  rows,
  columns,
  isPlaceholder,
  columnFilters,
  columnAriaSort,
  filtered,
  onClearFilters,
  selection,
  groups,
}: Readonly<Props>) {
  "use no memo";
  const table = useTable({
    features: transactionTableFeatures,
    data: rows.flatMap((row) => (row.kind === "transaction" ? [row.transaction] : [])),
    columns,
    getRowId: (transaction) => transaction.id,
  });
  const { t } = useTranslation();
  const columnCount = table.getAllColumns().length + (selection ? 1 : 0);
  const tableRows = new Map(table.getRowModel().rows.map((row) => [row.id, row]));

  function transactionRow(transaction: TransactionResponse, member: boolean) {
    const row = tableRows.get(transaction.id);
    if (!row) {
      return null;
    }
    const focusRef = groups?.focusRef(transaction.id);
    return (
      <TableRow
        key={row.id}
        ref={focusRef}
        tabIndex={focusRef ? -1 : undefined}
        data-kind={member ? "member" : undefined}
        className={isOptimistic(transaction) ? "stale" : undefined}
        aria-busy={isOptimistic(transaction) || undefined}
        data-state={selection?.selectedIds.has(transaction.id) ? "selected" : undefined}
      >
        {selection ? (
          <TableCell className="pr-0">
            {member ? (
              <CornerDownRight className="ml-1 size-3.5 text-muted-foreground" aria-hidden="true" />
            ) : (
              <SelectCell row={transaction} selection={selection} />
            )}
          </TableCell>
        ) : null}
        {row.getAllCells().map((cell) => (
          <TableCell key={cell.id} className="whitespace-normal">
            <table.FlexRender cell={cell} />
          </TableCell>
        ))}
      </TableRow>
    );
  }

  function ledgerRow(row: LedgerRow) {
    switch (row.kind) {
      case "transaction":
        return transactionRow(row.transaction, row.member);
      case "group":
        return groups ? (
          <GroupRow
            key={ledgerRowKey(row)}
            group={row.group}
            expanded={row.expanded}
            selectable={selection !== undefined}
            handlers={groups}
          />
        ) : null;
      default:
        return <GroupStatusRow key={ledgerRowKey(row)} status={row} columnCount={columnCount} />;
    }
  }

  let body: ReactNode;
  if (rows.length === 0) {
    body = (
      <TableEmptyRow colSpan={columnCount} filtered={filtered} onClearFilters={onClearFilters}>
        {t("transactions.empty")}
      </TableEmptyRow>
    );
  } else {
    body = rows.map(ledgerRow);
  }

  return (
    <ViewTransition name="transactions-rows" enter="none" exit="none">
      <div className="-mx-3">
        <ScrollRegion aria-label={t("transactions.title")}>
          <Table
            className={cn(
              "table-fixed",
              selection ? "min-w-228" : "min-w-220",
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
