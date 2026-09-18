import { Pagination } from "@/components/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTable } from "@tanstack/react-table";
import { transactionTableFeatures } from "./table-features";
import type { useTransactionColumns } from "./use-transaction-columns";
import { type ReactNode, ViewTransition } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";

interface Props {
  data: TransactionResponse[];
  columns: ReturnType<typeof useTransactionColumns>;
  isPlaceholder: boolean;
  columnFilters: Record<string, ReactNode>;
  filtered: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function TransactionsTable({
  data,
  columns,
  isPlaceholder,
  columnFilters,
  filtered,
  page,
  pageCount,
  onPageChange,
}: Readonly<Props>) {
  "use no memo";
  const table = useTable({
    features: transactionTableFeatures,
    data,
    columns,
  });
  const { t } = useTranslation();
  const columnCount = table.getAllColumns().length;

  let body: ReactNode;
  if (table.getRowModel().rows.length === 0) {
    body = (
      <TableRow className="hover:bg-transparent">
        <TableCell colSpan={columnCount} className="px-6 py-10 text-center text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("transactions.empty")}
        </TableCell>
      </TableRow>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <TableRow
        key={row.id}
        className={row.original.id?.startsWith("optimistic-") ? "is-stale" : undefined}
        aria-busy={row.original.id?.startsWith("optimistic-") || undefined}
      >
        {row.getAllCells().map((cell) => (
          <TableCell key={cell.id} className="px-6 py-3 whitespace-normal">
            <table.FlexRender cell={cell} />
          </TableCell>
        ))}
      </TableRow>
    ));
  }

  return (
    <section className="card overflow-hidden">
      <ViewTransition name="transactions-rows" enter="none" exit="none">
        <div
          className="overflow-x-auto"
          role="region"
          aria-label={t("transactions.title")}
          tabIndex={0}
        >
          <Table
            className={`min-w-[44rem] ${isPlaceholder ? "is-stale" : ""}`}
            aria-busy={isPlaceholder}
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-muted/50">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={`px-6 py-3 text-xs tracking-wide text-muted-foreground ${
                        header.column.id === "amount" ? "text-right" : ""
                      }`}
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
      </ViewTransition>

      <Pagination page={page} pages={pageCount} onPageChange={onPageChange} />
    </section>
  );
}
