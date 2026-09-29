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
import { Disclosure } from "@/components/disclosure/disclosure";
import { EditModal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";
import { CashFlowForecast } from "@/features/accounts/cash-flow-forecast/cash-flow-forecast";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useToday } from "@/hooks/use-settings";
import { notify, pendingId } from "@/lib/mutations";
import { optimisticRemoval } from "@/lib/optimistic";
import { billUrgencies, groupBills } from "../bill-groups";
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
  const today = useToday();
  const { groups, inactive } = groupBills(billList, today);

  function billRow(bill: RecurringBillResponse) {
    return (
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
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("recurringBills.title")}>
        <CreateDialog label={t("recurringBills.add")} title={t("recurringBills.add")}>
          {(close) => (
            <RecurringBillForm accounts={accountList} categories={categoryList} onClose={close} />
          )}
        </CreateDialog>
      </PageHeader>

      {billList.length > 0 ? <CashFlowForecast totals /> : null}
      {billList.length === 0 ? <EmptyText>{t("recurringBills.empty")}</EmptyText> : null}
      {billList.length > inactive.length ? (
        <Section className="space-y-4">
          {billUrgencies.map((urgency) =>
            groups[urgency].length > 0 ? (
              <div key={urgency}>
                <h2 id={`bills-${urgency}`} className="text-sm font-semibold text-muted-foreground">
                  {t(`recurringBills.groups.${urgency}`)}
                </h2>
                <Rows aria-labelledby={`bills-${urgency}`}>{groups[urgency].map(billRow)}</Rows>
              </div>
            ) : null,
          )}
        </Section>
      ) : null}
      {inactive.length > 0 ? (
        <Section>
          <Disclosure summary={t("recurringBills.groups.inactive", { count: inactive.length })}>
            <Rows>{inactive.map(billRow)}</Rows>
          </Disclosure>
        </Section>
      ) : null}
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
