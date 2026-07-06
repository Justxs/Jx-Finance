import { flexRender, type Table } from "@tanstack/react-table";
import { type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  table: Table<TransactionResponse>;
  isPending: boolean;
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}

export function TransactionsTable({ table, isPending, page, pageCount, onPageChange }: Readonly<Props>) {
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
        {row.getVisibleCells().map((cell) => (
          <td key={cell.id} className="px-6 py-3">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>
    ));
  }

  return (
    <section className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b bg-muted/50 text-left">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`px-6 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground ${
                    header.column.id === "amount" ? "text-right" : ""
                  }`}
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>{body}</tbody>
      </table>

      <div className="flex items-center justify-between border-t px-6 py-3 text-sm">
        <span className="text-muted-foreground">{t("transactions.pageInfo", { page, pages: pageCount })}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            {t("actions.previous")}
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
            {t("actions.next")}
          </Button>
        </div>
      </div>
    </section>
  );
}
