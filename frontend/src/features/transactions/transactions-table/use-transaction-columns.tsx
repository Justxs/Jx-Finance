import { createColumnHelper } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TagResponse, TransactionResponse } from "@/api/generated/model";
import { CategoryCell, type useInlineCategory } from "@/components/category-cell/category-cell";
import type { RowAction } from "@/components/row-actions/row-actions";
import { TagChips } from "@/components/tag-chips/tag-chips";
import { TransactionAmount } from "@/components/transaction-amount/transaction-amount";
import { Tag } from "@/components/ui/tag/tag";
import { UnusualAmountBadge } from "@/components/unusual-amount-badge/unusual-amount-badge";
import { DebtPaymentMarker } from "@/features/transactions/debt-payment/debt-payment";
import { ReceiptItemMatch } from "@/features/transactions/receipt-item-match/receipt-item-match";
import { RefundMark } from "@/features/transactions/refund-mark/refund-mark";
import { SharedExpenseMark } from "@/features/transactions/shared-expense/shared-expense";
import { SpreadMark } from "@/features/transactions/spread-mark/spread-mark";
import { AttachmentCount } from "@/features/transactions/transaction-attachments/attachment-count";
import { TransactionRowActions } from "@/features/transactions/transaction-row-actions/transaction-row-actions";
import { EMPTY_VALUE, useIsoDate } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { isOptimistic, transactionName } from "@/lib/transaction-row";
import { metaLine } from "@/lib/utils";
import type { transactionTableFeatures } from "./table-features";
import { useWideLedger } from "./use-wide-ledger";

const columnHelper = createColumnHelper<typeof transactionTableFeatures, TransactionResponse>();

export interface TransactionSelection {
  selectedIds: ReadonlySet<string>;
  selectableIds: string[];
  rowLabel: (row: TransactionResponse) => string;
  onToggle: (id: string, selected: boolean, extend: boolean) => void;
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
  onRefund: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  moreActions: (transaction: TransactionResponse) => RowAction[];
  onUpdateSplit: (transaction: TransactionResponse) => void;
}

interface ColumnArgs extends TransactionRowHandlers {
  categories: CategoryResponse[];
  inlineCategory: ReturnType<typeof useInlineCategory>;
}

export function useTransactionColumns({
  accountNames,
  categoryById,
  tagById,
  onEdit,
  onDuplicate,
  onRefund,
  onDelete,
  deletingId,
  moreActions,
  onUpdateSplit,
  categories,
  inlineCategory,
}: ColumnArgs) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const wide = useWideLedger();

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
        const { payeeName, payee, note, accountId, tagIds } = info.row.original;
        const bankText = info.getValue();
        const description = payeeName ?? (payee || bankText);
        const meta = metaLine(
          wide ? null : accountNames.get(accountId),
          !payeeName && payee ? bankText : null,
        );
        return (
          <span className="flex items-start gap-2">
            <span className="min-w-0 flex-1">
              {description ? (
                <span
                  className="line-clamp-2 font-medium wrap-break-word"
                  title={bankText ?? description}
                >
                  {description}
                </span>
              ) : (
                <span className="text-muted-foreground">{EMPTY_VALUE}</span>
              )}
              {meta || tagIds.length > 0 ? (
                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  {meta ? (
                    <span className="min-w-0 truncate text-xs text-muted-foreground" title={meta}>
                      {meta}
                    </span>
                  ) : null}
                  <TagChips tagIds={tagIds} tagById={tagById} />
                </span>
              ) : null}
              {note ? (
                <span
                  className="line-clamp-1 text-xs wrap-break-word text-muted-foreground"
                  title={note}
                >
                  {note}
                </span>
              ) : null}
              <ReceiptItemMatch transaction={info.row.original} />
            </span>
            <AttachmentCount count={info.row.original.attachmentCount} className="mt-0.5" />
            <UnusualAmountBadge
              transactionId={info.row.original.id}
              unusual={info.row.original.unusual}
              dismissed={info.row.original.unusualDismissed}
              className="mt-0.5"
            />
            <DebtPaymentMarker transaction={info.row.original} className="mt-0.5" />
            <RefundMark transaction={info.row.original} className="mt-0.5" />
            <SpreadMark transaction={info.row.original} className="mt-0.5" />
            <SharedExpenseMark
              transaction={info.row.original}
              onUpdate={onUpdateSplit}
              className="mt-0.5"
            />
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
          return (
            <CategoryCell
              transaction={row}
              categories={categories}
              label={rowName(row)}
              pendingCategoryId={inlineCategory.pendingCategoryIds.get(row.id)}
              onChange={(categoryId) => inlineCategory.categorize(row, categoryId)}
            />
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
    ...(wide
      ? [
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
        ]
      : []),
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
          moreActions={moreActions(info.row.original)}
          deletingId={deletingId}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onRefund={onRefund}
          onDelete={onDelete}
          className="justify-end"
        />
      ),
    }),
  ]);
}
