import { createColumnHelper } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { EMPTY_VALUE, useIsoDate } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { TransactionAmount, isOptimistic, transactionName } from "../transaction-amount";
import type { transactionTableFeatures } from "./table-features";

const columnHelper = createColumnHelper<typeof transactionTableFeatures, TransactionResponse>();

export interface TransactionSelection {
  selectedIds: ReadonlySet<string>;
  selectableIds: string[];
  rowLabel: (row: TransactionResponse) => string;
  onToggle: (id: string, selected: boolean) => void;
  onTogglePage: (selected: boolean) => void;
}

export function isSelectableTransaction(row: TransactionResponse) {
  return !row.isSplit && !isOptimistic(row);
}

interface UseTransactionColumnsArgs {
  accountNames: Map<string | undefined, string | undefined>;
  categoryById: Map<string | undefined, CategoryResponse | undefined>;
  onEdit: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function useTransactionColumns({
  accountNames,
  categoryById,
  onEdit,
  onDelete,
  deletingId,
}: UseTransactionColumnsArgs) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();

  function rowName(row: TransactionResponse) {
    return transactionName(row, categoryById, t);
  }

  return columnHelper.columns([
    columnHelper.accessor("date", {
      header: t("transactions.date"),
      cell: (info) => (
        <span className="whitespace-nowrap text-muted-foreground tabular-nums">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
    columnHelper.accessor("description", {
      header: t("transactions.description"),
      cell: (info) => {
        const description = info.getValue();
        if (!description) {
          return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
        }
        return (
          <span className="line-clamp-2 font-medium wrap-break-word" title={description}>
            {description}
          </span>
        );
      },
    }),
    columnHelper.accessor("categoryId", {
      header: t("transactions.category"),
      cell: (info) => {
        const row = info.row.original;
        if (row.isSplit) {
          return (
            <span className="inline-flex items-center gap-2">
              <Tag tone="accent">{t("transactions.split")}</Tag>
              <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {t("transactions.splitCategories", { count: row.lines?.length ?? 0 })}
              </span>
            </span>
          );
        }

        const category = categoryById.get(info.getValue() ?? "");
        if (!category) {
          return <span className="text-muted-foreground">{t("transactions.uncategorized")}</span>;
        }
        return (
          <span className="flex min-w-0 items-center gap-1.5" title={category.name}>
            <CategoryIcon
              icon={category.icon}
              className="size-3.5 shrink-0 text-muted-foreground"
            />
            <span className="truncate">{category.name}</span>
          </span>
        );
      },
    }),
    columnHelper.accessor("accountId", {
      header: t("transactions.account"),
      cell: (info) => {
        const name = accountNames.get(info.getValue()) ?? "";
        return (
          <span className="block truncate text-muted-foreground" title={name}>
            {name}
          </span>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: t("transactions.amount"),
      cell: (info) => (
        <TransactionAmount
          transaction={info.row.original}
          showReporting
          className="block text-right"
        />
      ),
    }),
    columnHelper.display({
      id: "actions",
      header: () => <span className="sr-only">{t("common.actions")}</span>,
      cell: (info) => {
        const row = info.row.original;
        const optimistic = isOptimistic(row);
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={optimistic}
              onClick={() => onEdit(row)}
              aria-label={`${t("actions.edit")}: ${rowName(row)}`}
            >
              <Pencil />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              pending={deletingId === row.id}
              disabled={optimistic || deletingId !== null}
              onClick={() => onDelete(row.id)}
              aria-label={`${t("actions.delete")}: ${rowName(row)}`}
            >
              <Trash2 />
            </Button>
          </div>
        );
      },
    }),
  ]);
}
