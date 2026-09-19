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
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { optimisticRemoval } from "@/lib/optimistic";
import { BillsForecastChart } from "../bills-forecast-chart";
import { CreateRecurringBillForm } from "../create-recurring-bill-form";
import { RecurringBillRow } from "../recurring-bill-row";

export function RecurringBillsPage() {
  const { t } = useTranslation();
  const [addOpen, setAddOpen] = useState(false);

  const accounts = useAccountsSuspense();
  const categories = useCategoriesSuspense();
  const bills = useRecurringBillsSuspense();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteRecurringBill({
    mutation: optimisticRemoval<RecurringBillResponse>(getRecurringBillsQueryKey()),
  });

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const billList = useDeferredValue(bills.data) ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (billList.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("recurringBills.empty")}</p>;
  } else {
    content = (
      <ul className="rows panel py-2 sm:py-3">
        {billList.map((bill) => (
          <RecurringBillRow
            key={bill.id}
            bill={bill}
            accounts={accountList}
            categories={categoryList}
            onDelete={() => setDeleteTarget(bill.id)}
            deletePending={deletingId === bill.id}
            deleteDisabled={deleteMutation.isPending}
          />
        ))}
      </ul>
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
        <CreateRecurringBillForm
          accounts={accountList}
          categories={categoryList}
          onCreated={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {billList.length > 0 ? (
        <section className="section">
          <h2 className="section-title mb-4">{t("recurringBills.forecast")}</h2>
          <BillsForecastChart bills={billList} />
        </section>
      ) : null}
      {content}
      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={billList.find((bill) => bill.id === deleteTarget)?.name ?? undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
