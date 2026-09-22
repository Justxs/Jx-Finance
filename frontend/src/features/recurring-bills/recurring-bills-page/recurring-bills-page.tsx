import { type ReactNode, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getRecurringBillsQueryKey,
  useDeleteRecurringBill,
  useAccountsSuspense,
  useCategoriesSuspense,
  useRecurringBillsSuspense,
  useSubscriptionCandidatesSuspense,
} from "@/api/generated";
import type { RecurringBillResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { CreateDialog } from "@/components/create-dialog/create-dialog";
import { PageHeader } from "@/components/page-header/page-header";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Panel, Section, SectionTitle } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";
import { BillsForecastChart } from "../bills-forecast-chart";
import { RecurringBillForm } from "../recurring-bill-form/recurring-bill-form";
import { RecurringBillRow } from "../recurring-bill-row";
import { SubscriptionSuggestions } from "../subscription-suggestions/subscription-suggestions";

export function RecurringBillsPage() {
  const { t } = useTranslation();

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const bills = useRecurringBillsSuspense();
  const candidates = useSubscriptionCandidatesSuspense();

  const deleteMutation = useDeleteRecurringBill({
    mutation: optimisticRemoval<RecurringBillResponse>(getRecurringBillsQueryKey()),
  });

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const billList = useDeferredValue(bills.data) ?? [];
  const candidateList = useDeferredValue(candidates.data) ?? [];
  const remove = useConfirmedDelete(deleteMutation, billList, (bill) => bill.name, "recurringBill");

  let content: ReactNode;
  if (billList.length === 0) {
    content = <EmptyText>{t("recurringBills.empty")}</EmptyText>;
  } else {
    content = (
      <Panel as={Rows} className="py-2 sm:py-3">
        {billList.map((bill) => (
          <RecurringBillRow
            key={bill.id}
            bill={bill}
            accounts={accountList}
            categories={categoryList}
            onDelete={() => remove.request(bill.id)}
            deletePending={remove.pendingId === bill.id}
            deleteDisabled={remove.busy}
          />
        ))}
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title={t("recurringBills.title")}>
        <CreateDialog label={t("recurringBills.add")} title={t("recurringBills.add")}>
          {(close) => (
            <RecurringBillForm
              accounts={accountList}
              categories={categoryList}
              onDone={close}
              onCancel={close}
            />
          )}
        </CreateDialog>
      </PageHeader>

      {billList.length > 0 ? (
        <Section>
          <SectionTitle className="mb-4">{t("recurringBills.forecast")}</SectionTitle>
          <BillsForecastChart bills={billList} />
        </Section>
      ) : null}
      {content}
      <SubscriptionSuggestions
        candidates={candidateList}
        accounts={accountList}
        categories={categoryList}
      />
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
