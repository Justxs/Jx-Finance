import { Pagination } from "@/components/pagination";
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
      <tr>
        <td colSpan={columnCount} className="px-6 py-10 text-center text-muted-foreground">
          {filtered ? t("filters.noMatches") : t("transactions.empty")}
        </td>
      </tr>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <tr
        key={row.id}
        className={`border-b last:border-0 hover:bg-muted/30 ${
          row.original.id?.startsWith("optimistic-") ? "is-stale" : ""
        }`}
        aria-busy={row.original.id?.startsWith("optimistic-") || undefined}
      >
        {row.getAllCells().map((cell) => (
          <td key={cell.id} className="px-6 py-3">
            <table.FlexRender cell={cell} />
          </td>
        ))}
      </tr>
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
          <table
            className={`w-full min-w-[44rem] text-sm ${isPlaceholder ? "is-stale" : ""}`}
            aria-busy={isPlaceholder}
          >
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50 text-left">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className={`px-6 py-3 text-xs font-medium tracking-wide text-muted-foreground ${
                        header.column.id === "amount" ? "text-right" : ""
                      }`}
                    >
                      {header.isPlaceholder
                        ? null
                        : (columnFilters[header.column.id] ?? <table.FlexRender header={header} />)}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>{body}</tbody>
          </table>
        </div>
      </ViewTransition>

      <Pagination page={page} pages={pageCount} onPageChange={onPageChange} />
    </section>
  );
}
