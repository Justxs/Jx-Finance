import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getGetRecurringBillsEndpointQueryKey,
  useDeleteRecurringBillEndpoint,
  useGetAccountsEndpoint,
  useGetCategoriesEndpoint,
  useGetRecurringBillsEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateRecurringBillForm } from "./create-recurring-bill-form";
import { RecurringBillRow } from "./recurring-bill-row";

export function RecurringBillsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const accounts = useGetAccountsEndpoint();
  const categories = useGetCategoriesEndpoint();
  const bills = useGetRecurringBillsEndpoint();

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetRecurringBillsEndpointQueryKey() });
  }

  const deleteMutation = useDeleteRecurringBillEndpoint({ mutation: { onSettled: invalidate } });

  const accountList = accounts.data ?? [];
  const categoryList = categories.data ?? [];
  const billList = bills.data ?? [];

  let content: ReactNode;
  if (bills.isPending) {
    content = (
      <div className="space-y-4 p-6">
        {Array.from({ length: 2 }, (_, index) => (
          <Skeleton key={index} className="h-16 w-full" />
        ))}
      </div>
    );
  } else if (billList.length === 0) {
    content = (
      <p className="px-6 py-8 text-sm text-muted-foreground">{t("recurringBills.empty")}</p>
    );
  } else {
    content = (
      <ul className="divide-y divide-border">
        {billList.map((bill) => (
          <RecurringBillRow
            key={bill.id}
            bill={bill}
            accounts={accountList}
            categories={categoryList}
            onDelete={() => deleteMutation.mutate({ id: bill.id! })}
            deletePending={deleteMutation.isPending}
            onSaved={invalidate}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("recurringBills.title")} subtitle={t("recurringBills.subtitle")}>
        <Button onClick={() => setAddOpen(true)}>
          <Plus />
          {t("recurringBills.add")}
        </Button>
      </PageHeader>

      <Dialog open={addOpen} onOpenChange={setAddOpen} title={t("recurringBills.add")}>
        <CreateRecurringBillForm
          accounts={accountList}
          categories={categoryList}
          onCreated={() => {
            invalidate();
            setAddOpen(false);
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <section className="card overflow-hidden">{content}</section>
    </div>
  );
}
