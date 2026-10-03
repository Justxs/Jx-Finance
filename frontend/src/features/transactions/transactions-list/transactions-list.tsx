import { useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { SharedScopeTag } from "@/components/shared-scope-tag/shared-scope-tag";
import { TagChips } from "@/components/tag-chips/tag-chips";
import { TransactionAmount } from "@/components/transaction-amount/transaction-amount";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { UnusualAmountBadge } from "@/components/unusual-amount-badge/unusual-amount-badge";
import { DebtPaymentMarker } from "@/features/transactions/debt-payment/debt-payment";
import {
  GroupMembersStatus,
  GroupNet,
  GroupToggle,
  useGroupCount,
  useGroupDates,
} from "@/features/transactions/ledger-groups/group-row";
import { type LedgerRow, ledgerRowKey } from "@/features/transactions/ledger-groups/ledger-rows";
import type { LedgerGroupHandlers } from "@/features/transactions/ledger-groups/use-ledger-groups";
import { ReceiptItemMatch } from "@/features/transactions/receipt-item-match/receipt-item-match";
import { RefundMark } from "@/features/transactions/refund-mark/refund-mark";
import { SharedExpenseMark } from "@/features/transactions/shared-expense/shared-expense";
import { SpreadMark } from "@/features/transactions/spread-mark/spread-mark";
import { AttachmentCount } from "@/features/transactions/transaction-attachments/attachment-count";
import { TransactionRowActions } from "@/features/transactions/transaction-row-actions/transaction-row-actions";
import type { TransactionRowHandlers } from "@/features/transactions/transactions-table/use-transaction-columns";
import { useIsoDate } from "@/hooks/use-formatters";
import { isOptimistic, transactionCategoryLabel, transactionName } from "@/lib/transaction-row";
import { cn, metaLine } from "@/lib/utils";

interface Props extends TransactionRowHandlers {
  rows: LedgerRow[];
  isPlaceholder: boolean;
  filtered: boolean;
  onClearFilters?: () => void;
  groups?: LedgerGroupHandlers;
}

export function TransactionsList({
  rows: data,
  accountNames,
  categoryById,
  tagById,
  isPlaceholder,
  filtered,
  onClearFilters,
  onEdit,
  onDuplicate,
  onRefund,
  onDelete,
  deletingId,
  moreActions,
  onUpdateSplit,
  groups,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const groupDates = useGroupDates();
  const groupCount = useGroupCount();
  const rows = useDeferredValue(data);

  if (rows.length === 0) {
    return (
      <EmptyText filtered={filtered} onClearFilters={onClearFilters}>
        {t("transactions.empty")}
      </EmptyText>
    );
  }

  return (
    <Rows
      className={isPlaceholder ? "stale" : undefined}
      aria-label={t("transactions.title")}
      aria-busy={isPlaceholder}
    >
      {rows.map((ledgerRow) => {
        if (ledgerRow.kind === "group") {
          const { group } = ledgerRow;
          return groups ? (
            <li key={ledgerRowKey(ledgerRow)} className="py-2 text-sm" data-kind="group">
              <div className="flex items-center gap-2">
                <GroupToggle
                  group={group}
                  expanded={ledgerRow.expanded}
                  onToggle={groups.onToggle}
                />
                <p className="min-w-0 flex-1 truncate font-medium" title={group.name}>
                  {group.name}
                </p>
                <GroupNet group={group} className="shrink-0 text-right" />
              </div>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground tabular-nums">
                  {metaLine(groupDates.text(group), groupCount(group))}
                </p>
                <SharedScopeTag scope={group.scope} householdId={group.householdId} />
                <RowActions
                  label={group.name}
                  actions={groups.actions(group)}
                  className="-mr-2 gap-0"
                />
              </div>
            </li>
          ) : null;
        }
        if (ledgerRow.kind !== "transaction") {
          return (
            <li key={ledgerRowKey(ledgerRow)} className="border-l-2 py-2 pl-4">
              <GroupMembersStatus status={ledgerRow} />
            </li>
          );
        }
        const row = ledgerRow.transaction;
        const focusRef = groups?.focusRef(row.id);
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
              ref={focusRef}
              tabIndex={focusRef ? -1 : undefined}
              data-kind={ledgerRow.member ? "member" : undefined}
              className={cn(
                "py-2 text-sm",
                ledgerRow.member && "border-l-2 pl-4",
                optimistic && "stale",
              )}
              aria-busy={optimistic || undefined}
            >
              <div className="flex items-baseline gap-3">
                <p className="min-w-0 flex-1 truncate font-medium" title={name}>
                  {name}
                </p>
                <AttachmentCount count={row.attachmentCount} />
                <UnusualAmountBadge
                  transactionId={row.id}
                  unusual={row.unusual}
                  dismissed={row.unusualDismissed}
                />
                <DebtPaymentMarker transaction={row} />
                <SharedExpenseMark transaction={row} onUpdate={onUpdateSplit} />
                <TransactionAmount
                  transaction={row}
                  showReporting
                  className="shrink-0 text-right"
                />
              </div>
              {row.note ? (
                <p className="truncate text-xs text-muted-foreground" title={row.note}>
                  {row.note}
                </p>
              ) : null}
              <ReceiptItemMatch transaction={row} />
              <TagChips tagIds={row.tagIds} tagById={tagById} className="mt-1" />
              <RefundMark transaction={row} className="mt-1" />
              <SpreadMark transaction={row} className="mt-1" />
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
                  moreActions={moreActions(row)}
                  deletingId={deletingId}
                  onEdit={onEdit}
                  onDuplicate={onDuplicate}
                  onRefund={onRefund}
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
