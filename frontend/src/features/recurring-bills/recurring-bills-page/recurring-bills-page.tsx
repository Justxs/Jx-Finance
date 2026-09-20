import { Plus } from "lucide-react";
import { type ReactNode, useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getRecurringBillsQueryKey,
  useDeleteRecurringBill,
  useAccountsSuspense,
  useCategoriesSuspense,
  useRecurringBillsSuspense,
} from "@/api/generated";
import type { RecurringBillResponse } from "@/api/generated/model";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { Button } from "@/components/ui/button/button";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Panel, Section, SectionTitle } from "@/components/ui/section/section";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { optimisticRemoval } from "@/lib/optimistic";
import { BillsForecastChart } from "../bills-forecast-chart";
import { RecurringBillForm } from "../recurring-bill-form/recurring-bill-form";
import { RecurringBillRow } from "../recurring-bill-row";

export function RecurringBillsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const bills = useRecurringBillsSuspense();

  const deleteMutation = useDeleteRecurringBill({
    mutation: optimisticRemoval<RecurringBillResponse>(getRecurringBillsQueryKey()),
  });

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const billList = useDeferredValue(bills.data) ?? [];
  const remove = useConfirmedDelete(deleteMutation, billList, (bill) => bill.name);

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
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("recurringBills.add")}
        </Button>
      </PageHeader>

      <Modal open={addOpen} onOpenChange={setAddOpen} title={t("recurringBills.add")}>
        <RecurringBillForm
          accounts={accountList}
          categories={categoryList}
          onDone={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {billList.length > 0 ? (
        <Section>
          <SectionTitle className="mb-4">{t("recurringBills.forecast")}</SectionTitle>
          <BillsForecastChart bills={billList} />
        </Section>
      ) : null}
      {content}
      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
