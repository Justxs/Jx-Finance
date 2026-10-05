import { useTranslation } from "react-i18next";
import {
  useDeleteSettlement,
  useDeleteSharedExpense,
  useMeSuspense,
  useSettlementsSuspense,
  useSharedExpensesSuspense,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { PagedRows } from "@/components/paged-rows/paged-rows";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRow, RecordRowsSkeleton } from "@/components/record-row/record-row";
import { childDelete, useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePagedItems, usePagedList } from "@/hooks/use-paged-list";
import { metaLine } from "@/lib/utils";

const PAGE_SIZE = 10;

interface Props {
  householdId: string;
}

function SplitList({ householdId }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const meId = useMeSuspense().data.id;
  const paging = usePagedList();
  const data = useSharedExpensesSuspense(householdId, {
    page: paging.shownPage,
    pageSize: PAGE_SIZE,
  }).data;
  const { items, pages, range } = usePagedItems(paging, data, PAGE_SIZE);
  const removeSplit = useDeleteSharedExpense();
  const remove = useConfirmedDelete(
    childDelete(
      removeSplit,
      (expenseId) => ({ id: householdId, expenseId }),
      (variables) => variables.expenseId,
    ),
    items,
    (item) => item.description ?? formatDate(item.date),
    "sharedExpense",
  );

  return (
    <>
      <PagedRows
        paging={paging}
        pages={pages}
        range={range}
        count={items.length}
        emptyText={t("households.shared.emptySplits")}
      >
        {items.map((item) => (
          <RecordRow
            key={item.id}
            title={item.description ?? EMPTY_VALUE}
            subtitle={metaLine(
              formatDate(item.date),
              t("households.shared.paidBy", { name: item.payerName }),
              item.myShare !== null &&
                t("households.shared.yourShare", {
                  amount: money.format(Number(item.myShare), item.currency),
                }),
            )}
            note={item.counted ? undefined : t("households.shared.notCounted")}
            amount={money.format(Number(item.amount), item.currency)}
            label={item.description ?? formatDate(item.date)}
            {...(item.payerId === meId ? remove.deleteProps(item.id) : {})}
          />
        ))}
      </PagedRows>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </>
  );
}

function PaymentList({ householdId }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const meId = useMeSuspense().data.id;
  const paging = usePagedList();
  const data = useSettlementsSuspense(householdId, {
    page: paging.shownPage,
    pageSize: PAGE_SIZE,
  }).data;
  const { items, pages, range } = usePagedItems(paging, data, PAGE_SIZE);
  const removePayment = useDeleteSettlement();
  const remove = useConfirmedDelete(
    childDelete(
      removePayment,
      (settlementId) => ({ id: householdId, settlementId }),
      (variables) => variables.settlementId,
    ),
    items,
    (item) => t("households.shared.paid", { from: item.fromName, to: item.toName }),
    "settlement",
  );

  return (
    <>
      <PagedRows
        paging={paging}
        pages={pages}
        range={range}
        count={items.length}
        emptyText={t("households.shared.emptyPayments")}
      >
        {items.map((item) => (
          <RecordRow
            key={item.id}
            title={t("households.shared.paid", { from: item.fromName, to: item.toName })}
            subtitle={metaLine(
              formatDate(item.date),
              item.note,
              item.hasTransfer && t("households.shared.withTransfer"),
            )}
            amount={money.format(Number(item.amount), item.currency)}
            label={t("households.shared.paid", { from: item.fromName, to: item.toName })}
            {...(item.fromUserId === meId || item.toUserId === meId
              ? remove.deleteProps(item.id)
              : {})}
          />
        ))}
      </PagedRows>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </>
  );
}

export function SharedExpenses({ householdId }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4 border-t pt-4">
      <h4 className="text-sm font-semibold">{t("households.shared.title")}</h4>
      <div className="space-y-2">
        <h5 className="text-sm font-medium">{t("households.shared.splits")}</h5>
        <QueryBoundary
          fallback={<RecordRowsSkeleton />}
          errorSubject={t("households.shared.splits")}
        >
          <SplitList householdId={householdId} />
        </QueryBoundary>
      </div>
      <div className="space-y-2">
        <h5 className="text-sm font-medium">{t("households.shared.payments")}</h5>
        <QueryBoundary
          fallback={<RecordRowsSkeleton rows={2} />}
          errorSubject={t("households.shared.payments")}
        >
          <PaymentList householdId={householdId} />
        </QueryBoundary>
      </div>
    </div>
  );
}
