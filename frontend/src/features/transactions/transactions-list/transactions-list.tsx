import { Copy, Pencil, Trash2 } from "lucide-react";
import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TagResponse, TransactionResponse } from "@/api/generated/model";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { staleVariants } from "@/components/ui/stale-region/stale-region";
import { TagChips } from "@/features/tags/tag-chips/tag-chips";
import { AttachmentCount } from "@/features/transactions/transaction-attachments/attachment-count";
import { useIsoDate } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import {
  TransactionAmount,
  isOptimistic,
  transactionCategoryLabel,
  transactionName,
} from "../transaction-amount";

interface Props {
  data: TransactionResponse[];
  accountNames: Map<string | undefined, string | undefined>;
  categoryById: Map<string | undefined, CategoryResponse | undefined>;
  tagById: ReadonlyMap<string, TagResponse>;
  isPlaceholder: boolean;
  filtered: boolean;
  onEdit: (transaction: TransactionResponse) => void;
  onDuplicate: (transaction: TransactionResponse) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
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
      className={staleVariants({ stale: isPlaceholder })}
      aria-label={t("transactions.title")}
      aria-busy={isPlaceholder}
    >
      {rows.map((row) => {
        const name = transactionName(row, categoryById, t);
        const optimistic = isOptimistic(row);
        const categoryLabel = transactionCategoryLabel(row, categoryById, t);
        const meta = [
          formatDate(row.date),
          row.description ? categoryLabel : null,
          accountNames.get(row.accountId),
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <RowTransition key={row.id}>
            <li
              className={cn("py-2 text-sm", staleVariants({ stale: optimistic }))}
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
                <div className="-mr-2 flex shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={optimistic}
                    onClick={() => onDuplicate(row)}
                    aria-label={`${t("transactions.duplicate")}: ${name}`}
                  >
                    <Copy />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={optimistic}
                    onClick={() => onEdit(row)}
                    aria-label={`${t("actions.edit")}: ${name}`}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    pending={deletingId === row.id}
                    disabled={optimistic || deletingId !== null}
                    onClick={() => onDelete(row.id)}
                    aria-label={`${t("actions.delete")}: ${name}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </li>
          </RowTransition>
        );
      })}
    </Rows>
  );
}
