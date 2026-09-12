import { Pagination } from "@/components/pagination";
import { useTable } from "@tanstack/react-table";
import { transactionTableFeatures } from "./table-features";
import type { useTransactionColumns } from "./use-transaction-columns";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  data: TransactionResponse[];
  columns: ReturnType<typeof useTransactionColumns>;
  isPending: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function TransactionsTable({
  data,
  columns,
  isPending,
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
  if (isPending) {
    body = Array.from({ length: 5 }, (_, index) => (
      <tr key={index} className="border-b last:border-0">
        <td colSpan={columnCount} className="px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        </td>
      </tr>
    ));
  } else if (table.getRowModel().rows.length === 0) {
    body = (
      <tr>
        <td colSpan={columnCount} className="px-6 py-10 text-center text-muted-foreground">
          {t("transactions.empty")}
        </td>
      </tr>
    );
  } else {
    body = table.getRowModel().rows.map((row) => (
      <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
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
      <div
        className="overflow-x-auto"
        role="region"
        aria-label={t("transactions.title")}
        tabIndex={0}
      >
        <table className="w-full min-w-[44rem] text-sm">
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
                    {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>{body}</tbody>
        </table>
      </div>

      <Pagination page={page} pages={pageCount} onPageChange={onPageChange} />
    </section>
  );
}
