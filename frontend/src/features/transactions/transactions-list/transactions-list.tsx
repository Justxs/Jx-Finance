import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import type { TransactionResponse } from "@/api/generated/model";
import { RowTransition } from "@/components/row-transition/row-transition";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { TagChips } from "@/features/tags/tag-chips/tag-chips";
import { AttachmentCount } from "@/features/transactions/transaction-attachments/attachment-count";
import { useIsoDate } from "@/hooks/use-formatters";
import { cn, metaLine } from "@/lib/utils";
import {
  TransactionAmount,
  isOptimistic,
  transactionCategoryLabel,
  transactionName,
} from "../transaction-amount";
import { TransactionRowActions } from "../transaction-row-actions/transaction-row-actions";
import type { TransactionRowHandlers } from "../transactions-table/use-transaction-columns";

interface Props extends TransactionRowHandlers {
  data: TransactionResponse[];
  isPlaceholder: boolean;
  filtered: boolean;
}

export function TransactionsList({
  data,
  accountNames,
  categoryById,
  tagById,
  isPlaceholder,
  filtered,
  onEdit,
  onDuplicate,
  onDelete,
  deletingId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const rows = useDeferredValue(data);

  if (rows.length === 0) {
    return <EmptyText filtered={filtered}>{t("transactions.empty")}</EmptyText>;
  }

  return (
    <Rows
      className={isPlaceholder ? "stale" : undefined}
      aria-label={t("transactions.title")}
      aria-busy={isPlaceholder}
    >
      {rows.map((row) => {
        const name = transactionName(row, categoryById, t);
        const optimistic = isOptimistic(row);
        const categoryLabel = transactionCategoryLabel(row, categoryById, t);
        const meta = metaLine(
          formatDate(row.date),
          row.description ? categoryLabel : null,
          accountNames.get(row.accountId),
        );

        return (
          <RowTransition key={row.id}>
            <li
              className={cn("py-2 text-sm", optimistic && "stale")}
              aria-busy={optimistic || undefined}
            >
              <div className="flex items-baseline gap-3">
                <p className="min-w-0 flex-1 truncate font-medium" title={name}>
                  {name}
                </p>
                <AttachmentCount count={row.attachmentCount} />
                <TransactionAmount
                  transaction={row}
                  showReporting
                  className="shrink-0 text-right"
                />
              </div>
              <TagChips tagIds={row.tagIds} tagById={tagById} className="mt-1" />
              <div className="flex items-center gap-2">
                <p
                  className="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular-nums"
                  title={meta}
                >
                  {meta}
                </p>
                <TransactionRowActions
                  transaction={row}
                  label={name}
                  deletingId={deletingId}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onDelete={onDelete}
                  className="-mr-2 gap-0"
                />
              </div>
            </li>
          </RowTransition>
        );
      })}
    </Rows>
  );
}
