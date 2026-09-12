import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { useDate, useMoney } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { transactionTableFeatures } from "./table-features";

const columnHelper = createColumnHelper<typeof transactionTableFeatures, TransactionResponse>();

interface UseTransactionColumnsArgs {
  accountNames: Map<string | undefined, string | undefined>;
  categoryById: Map<string | undefined, CategoryResponse | undefined>;
  onEdit: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  deletePending: boolean;
}

export function useTransactionColumns({
  accountNames,
  categoryById,
  onEdit,
  onDelete,
  deletePending,
}: UseTransactionColumnsArgs) {
  const { t } = useTranslation();
  const money = useMoney();
  const date = useDate();

  return columnHelper.columns([
    columnHelper.accessor("date", {
      header: t("transactions.date"),
      cell: (info) => (info.getValue() ? date.format(new Date(info.getValue()!)) : ""),
    }),
    columnHelper.accessor("description", {
      header: t("transactions.description"),
      cell: (info) => info.getValue() || "—",
    }),
    columnHelper.accessor("categoryId", {
      header: t("transactions.category"),
      cell: (info) => {
        const row = info.row.original;
        if (row.isSplit) {
          return (
            <span className="inline-flex items-center gap-2">
              <span className="inline-flex rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                {t("transactions.split")}
              </span>
              <span className="text-xs text-muted-foreground">
                {row.lines?.length ?? 0} {t("transactions.category").toLowerCase()}
              </span>
            </span>
          );
        }

        const category = categoryById.get(info.getValue() ?? "");
        if (!category) {
          return <span className="text-muted-foreground">{t("transactions.uncategorized")}</span>;
        }
        return (
          <span className="inline-flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <CategoryIcon icon={category.icon} className="size-3.5" />
            </span>
            {category.name}
          </span>
        );
      },
    }),
    columnHelper.accessor("accountId", {
      header: t("transactions.account"),
      cell: (info) => accountNames.get(info.getValue()) ?? "",
    }),
    columnHelper.accessor("amount", {
      header: t("transactions.amount"),
      cell: (info) => {
        const row = info.row.original;
        return (
          <span
            className={`block text-right font-semibold tabular-nums ${
              row.type === "income" ? "text-secondary" : "text-foreground"
            }`}
          >
            {row.type === "income" ? "+" : "−"}
            {money.format(Number(info.getValue()))}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const row = info.row.original;
        const isOptimistic = row.id?.startsWith("optimistic-");
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isOptimistic}
              onClick={() => onEdit(row)}
              aria-label={t("actions.edit")}
              title={t("actions.edit")}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              disabled={isOptimistic || deletePending}
              onClick={() => onDelete(row.id!)}
              aria-label={t("actions.delete")}
              title={t("actions.delete")}
            >
              <Trash2 />
            </Button>
          </div>
        );
      },
    }),
  ]);
}
