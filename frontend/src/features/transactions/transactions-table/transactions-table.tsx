import { useTable } from "@tanstack/react-table";
import { CornerDownRight } from "lucide-react";
import { type MouseEvent, type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { amountColumnWide, signedAmount } from "@/components/transaction-amount/transaction-amount";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import {
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableEmptyRow,
} from "@/components/ui/table/table";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { GroupRow, GroupStatusRow } from "@/features/transactions/ledger-groups/group-row";
import { type LedgerRow, ledgerRowKey } from "@/features/transactions/ledger-groups/ledger-rows";
import type { LedgerGroupHandlers } from "@/features/transactions/ledger-groups/use-ledger-groups";
import { useMoney } from "@/hooks/use-formatters";
import { isOptimistic } from "@/lib/transaction-row";
import { cn } from "@/lib/utils";
import { transactionTableFeatures } from "./table-features";
import {
  isSelectableTransaction,
  type TransactionSelection,
  type useTransactionColumns,
} from "./use-transaction-columns";
import { useWideLedger } from "./use-wide-ledger";

const SELECT_WIDTH = "w-10";

const columnWidth: Record<string, `w-${string}`> = {
  date: "w-27",
  categoryId: "w-44",
  accountId: "w-36",
  amount: "w-30",
  actions: "w-23 pointer-coarse:w-29",
};

const WIDE_AMOUNT_WIDTH = "w-38";

function ledgerColumnWidths(columnIds: readonly string[], wideAmounts: boolean) {
  return columnIds.map((id) =>
    id === "amount" && wideAmounts ? WIDE_AMOUNT_WIDTH : columnWidth[id],
  );
}

function extendsRange(event: Event) {
  return "shiftKey" in event && event.shiftKey === true;
}

function keepTextUnselected(event: MouseEvent<HTMLElement>) {
  if (event.shiftKey) {
    event.preventDefault();
    event.currentTarget.focus();
  }
}

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
      onMouseDown={keepTextUnselected}
      onCheckedChange={(next, details) => selection.onToggle(id, next, extendsRange(details.event))}
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
  const money = useMoney();
  const transactions = rows.flatMap((row) => (row.kind === "transaction" ? [row.transaction] : []));
  const wideAmounts = amountColumnWide(
    transactions.map((transaction) => signedAmount(money, transaction)),
  );
  const table = useTable({
    features: transactionTableFeatures,
    data: transactions,
    columns,
    getRowId: (transaction) => transaction.id,
  });
  const { t } = useTranslation();
  const columnCount = table.getAllColumns().length + (selection ? 1 : 0);
  const tableRows = new Map(table.getRowModel().rows.map((row) => [row.id, row]));
  const columnIds = table.getAllColumns().map((column) => column.id);
  const nameSpan = columnIds.length - 3;
  const accountShown = columnIds.includes("accountId");

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
        {row.getAllCells().map((cell) => {
          const content = cell.column.columnDef.cell;
          return (
            <TableCell key={cell.id} className="whitespace-normal">
              {typeof content === "function" ? content(cell.getContext()) : content}
            </TableCell>
          );
        })}
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
            nameSpan={nameSpan}
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

  const columnWidths = ledgerColumnWidths(columnIds, wideAmounts);

  return (
    <ViewTransition name="transactions-rows" enter="none" exit="none">
      <Table
        label={t("transactions.title")}
        columns={selection ? [SELECT_WIDTH, ...columnWidths] : columnWidths}
        className={cn(
          accountShown ? "min-w-230" : "min-w-194",
          wideAmounts && (accountShown ? "min-w-238" : "min-w-202"),
          isPlaceholder && "stale",
        )}
        aria-busy={isPlaceholder}
      >
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
    </ViewTransition>
  );
}

interface SkeletonProps {
  rows: number;
  className?: string;
}

export function TransactionsTableSkeleton({ rows, className }: Readonly<SkeletonProps>) {
  const wide = useWideLedger();
  const columnIds = [
    "date",
    "description",
    "categoryId",
    ...(wide ? ["accountId"] : []),
    "amount",
    "actions",
  ];

  return (
    <div data-slot="table-skeleton" aria-hidden="true" className={cn("-mx-3", className)}>
      <Table
        columns={[SELECT_WIDTH, ...ledgerColumnWidths(columnIds, false)]}
        className={wide ? "min-w-230" : "min-w-194"}
      >
        <TableHeader>
          <TableRow>
            <TableHead className="pr-0">
              <Skeleton className="size-4 rounded-md" />
            </TableHead>
            {columnIds.map((id) => (
              <TableHead key={id}>
                {id === "actions" ? null : (
                  <TextSkeleton
                    size="xs"
                    width="w-16"
                    className={id === "amount" ? "justify-end" : undefined}
                  />
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }, (_, row) => (
            <TableRow key={row}>
              <TableCell className="pr-0">
                <Skeleton className="size-4 rounded-md" />
              </TableCell>
              <TableCell>
                <TextSkeleton size="sm" width="w-20" />
              </TableCell>
              <TableCell>
                <TextSkeleton size="sm" width={rowWidth(row)} />
                <TextSkeleton size="xs" width="w-1/3" />
              </TableCell>
              <TableCell>
                <div className="flex h-8 items-center">
                  <Skeleton className="h-[0.7em] w-3/5 rounded-sm" />
                </div>
              </TableCell>
              {wide ? (
                <TableCell>
                  <TextSkeleton size="sm" width="w-3/5" />
                </TableCell>
              ) : null}
              <TableCell>
                <TextSkeleton size="sm" width="w-16" className="justify-end" />
              </TableCell>
              <TableCell>
                <div className="flex justify-end">
                  <IconButtonSkeleton />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
