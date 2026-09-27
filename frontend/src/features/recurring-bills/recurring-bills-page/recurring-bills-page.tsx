import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getRecurringBillsQueryKey,
  useDeleteRecurringBill,
  useAccountsSuspense,
  useCategoriesSuspense,
  useRecurringBillsSuspense,
  useSubscriptionCandidatesSuspense,
  useUpdateRecurringBill,
} from "@/api/generated";
import type { RecurringBillResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { PanelRows } from "@/components/panel-rows/panel-rows";
import { TitledSection } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { notify, pendingId } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { BillsForecastChart } from "../bills-forecast-chart";
import { RecurringBillForm } from "../recurring-bill-form/recurring-bill-form";
import { RecurringBillConfirmForm, RecurringBillRow } from "../recurring-bill-row";
import { SubscriptionSuggestions } from "../subscription-suggestions/subscription-suggestions";

export function RecurringBillsPage() {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<RecurringBillResponse | null>(null);
  const [confirming, setConfirming] = useState<RecurringBillResponse | null>(null);

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const bills = useRecurringBillsSuspense();
  const candidates = useSubscriptionCandidatesSuspense();

  const deleteMutation = useDeleteRecurringBill({
    mutation: optimisticRemoval<RecurringBillResponse>(getRecurringBillsQueryKey()),
  });
  const updateMutation = useUpdateRecurringBill(notify(t("recurringBills.expectedUpdated")));

  function updateExpected(bill: RecurringBillResponse, amount: string) {
    updateMutation.mutate({
      id: bill.id,
      data: {
        name: bill.name,
        shape: bill.shape,
        kind: bill.kind,
        amount,
        categoryId: bill.categoryId,
        accountId: bill.accountId,
        toAccountId: bill.toAccountId,
        cadence: bill.cadence,
        nextDueDate: bill.nextDueDate,
        remindDaysBefore: bill.remindDaysBefore,
        isActive: bill.isActive,
        matchKey: bill.matchKey,
        debtId: bill.debtId,
      },
    });
  }

  const accountList = accounts.data;
  const categoryList = categories.data;
  const billList = useDeferredValue(bills.data);
  const candidateList = useDeferredValue(candidates.data);
  const remove = useConfirmedDelete(deleteMutation, billList, (bill) => bill.name, "recurringBill");

  return (
    <div className="space-y-5">
      <PageHeader title={t("recurringBills.title")}>
        <CreateDialog label={t("recurringBills.add")} title={t("recurringBills.add")}>
          {(close) => (
            <RecurringBillForm accounts={accountList} categories={categoryList} onClose={close} />
          )}
        </CreateDialog>
      </PageHeader>

      {billList.length > 0 ? (
        <TitledSection title={t("recurringBills.forecast")} bodyGap="md">
          <BillsForecastChart bills={billList} />
        </TitledSection>
      ) : null}
      <PanelRows count={billList.length} emptyText={t("recurringBills.empty")}>
        {billList.map((bill) => (
          <RecurringBillRow
            key={bill.id}
            bill={bill}
            accounts={accountList}
            categories={categoryList}
            onEdit={() => setEditing(bill)}
            onConfirm={() => setConfirming(bill)}
            onUpdateAmount={(amount) => updateExpected(bill, amount)}
            updatePending={pendingId(updateMutation) === bill.id}
            {...remove.deleteProps(bill.id)}
          />
        ))}
      </PanelRows>
      <SubscriptionSuggestions
        candidates={candidateList}
        accounts={accountList}
        categories={categoryList}
      />
      <EditModal
        item={editing}
        onClose={() => setEditing(null)}
        title={t("recurringBills.editTitle")}
        description={(bill) => bill.name}
      >
        {(bill, close) => (
          <RecurringBillForm
            bill={bill}
            accounts={accountList}
            categories={categoryList}
            onClose={close}
          />
        )}
      </EditModal>
      <EditModal
        item={confirming}
        onClose={() => setConfirming(null)}
        title={t("recurringBills.confirmTitle")}
      >
        {(bill, close) => (
          <RecurringBillConfirmForm bill={bill} accounts={accountList} onClose={close} />
        )}
      </EditModal>
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
