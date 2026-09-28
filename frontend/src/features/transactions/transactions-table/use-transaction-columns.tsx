import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TagResponse, TransactionResponse } from "@/api/generated/model";
import { Tag } from "@/components/ui/tag/tag";
import { TagChips } from "@/features/tags/tag-chips/tag-chips";
import { AttachmentCount } from "@/features/transactions/transaction-attachments/attachment-count";
import { UnusualAmountBadge } from "@/features/transactions/unusual-amount/unusual-amount-badge";
import { EMPTY_VALUE, useIsoDate } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { DebtPaymentMarker } from "../debt-payment/debt-payment";
import { TransactionAmount, isOptimistic, transactionName } from "../transaction-amount";
import { TransactionRowActions } from "../transaction-row-actions/transaction-row-actions";
import { CategoryCell } from "./category-cell";
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

export interface TransactionRowHandlers {
  accountNames: Map<string | undefined, string | undefined>;
  categoryById: Map<string | undefined, CategoryResponse | undefined>;
  tagById: ReadonlyMap<string, TagResponse>;
  onEdit: (transaction: TransactionResponse) => void;
  onDuplicate: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}

export function useTransactionColumns({
  accountNames,
  categoryById,
  tagById,
  onEdit,
  onDuplicate,
  onDelete,
  deletingId,
}: TransactionRowHandlers) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();

  const categories = [...categoryById.values()].filter((category) => category !== undefined);

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
        return (
          <span className="flex items-start gap-2">
            {description ? (
              <span className="line-clamp-2 font-medium wrap-break-word" title={description}>
                {description}
              </span>
            ) : (
              <span className="text-muted-foreground">{EMPTY_VALUE}</span>
            )}
            <AttachmentCount count={info.row.original.attachmentCount} className="mt-0.5" />
            <UnusualAmountBadge
              transactionId={info.row.original.id}
              unusual={info.row.original.unusual}
              dismissed={info.row.original.unusualDismissed}
              className="mt-0.5"
            />
            <DebtPaymentMarker transaction={info.row.original} className="mt-0.5" />
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

        if (!isOptimistic(row)) {
          return <CategoryCell transaction={row} categories={categories} label={rowName(row)} />;
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
    columnHelper.accessor("tagIds", {
      header: t("tags.field"),
      cell: (info) => {
        const ids = info.getValue();
        if (ids.length === 0) {
          return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
        }
        return <TagChips tagIds={ids} tagById={tagById} />;
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
      cell: (info) => (
        <TransactionRowActions
          transaction={info.row.original}
          label={rowName(info.row.original)}
          deletingId={deletingId}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          className="justify-end"
        />
      ),
    }),
  ]);
}
