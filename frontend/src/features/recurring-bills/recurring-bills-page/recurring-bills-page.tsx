import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useState, useDeferredValue } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetRecurringBillsEndpointQueryKey,
  useDeleteRecurringBillEndpoint,
  useGetAccountsEndpointSuspense,
  useGetCategoriesEndpointSuspense,
  useGetRecurringBillsEndpointSuspense,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { CreateRecurringBillForm } from "../create-recurring-bill-form";
import { RecurringBillRow } from "../recurring-bill-row";

export function RecurringBillsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const accounts = useGetAccountsEndpointSuspense();
  const categories = useGetCategoriesEndpointSuspense();
  const bills = useGetRecurringBillsEndpointSuspense();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetRecurringBillsEndpointQueryKey() });
  }

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteRecurringBillEndpoint({ mutation: { onSettled: invalidate } });

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const billList = useDeferredValue(bills.data) ?? [];

  const deletingId = deleteMutation.isPending ? deleteMutation.variables?.id : undefined;

  let content: ReactNode;
  if (billList.length === 0) {
    content = <p className="py-6 text-sm text-muted-foreground">{t("recurringBills.empty")}</p>;
  } else {
    content = (
      <ul className="rows border-t border-t-rule">
        {billList.map((bill) => (
          <RecurringBillRow
            key={bill.id}
            bill={bill}
            accounts={accountList}
            categories={categoryList}
            onDelete={() => setDeleteTarget(bill.id!)}
            deletePending={deletingId === bill.id}
            deleteDisabled={deleteMutation.isPending}
            onSaved={invalidate}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-10">
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
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

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
