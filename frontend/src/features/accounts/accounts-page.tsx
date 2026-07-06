import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGetAccountsEndpointQueryKey,
  getGetDashboardSummaryEndpointQueryKey,
  useCreateAccountEndpoint,
  useDeleteAccountEndpoint,
  useGetAccountsEndpoint,
  useUpdateAccountEndpoint,
} from "@/api/generated";
import { PageHeader } from "@/components/page-header";
import { ImportSection } from "@/features/imports/import-section";
import { AccountForm } from "./account-form";
import { AccountsTable } from "./accounts-table";
import { TransfersSection } from "./transfers-section";

export function AccountsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const accounts = useGetAccountsEndpoint();
  const [editingId, setEditingId] = useState<string | null>(null);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getGetAccountsEndpointQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryEndpointQueryKey() });
  }

  const createMutation = useCreateAccountEndpoint({ mutation: { onSettled: invalidate } });
  const updateMutation = useUpdateAccountEndpoint({
    mutation: {
      onSuccess: () => setEditingId(null),
      onSettled: invalidate,
    },
  });
  const deleteMutation = useDeleteAccountEndpoint({
    mutation: {
      onSuccess: () => toast.success(t("accounts.archived")),
      onSettled: invalidate,
    },
  });

  const accountList = accounts.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader title={t("accounts.title")} subtitle={t("accounts.subtitle")} />

      <section className="card p-6">
        <h2 className="mb-5 font-semibold">{t("accounts.add")}</h2>
        <AccountForm
          pending={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate({ data: values })}
        />
      </section>

      <AccountsTable
        accounts={accountList}
        isPending={accounts.isPending}
        editingId={editingId}
        onEdit={setEditingId}
        onCancelEdit={() => setEditingId(null)}
        updatePending={updateMutation.isPending}
        onUpdate={(id, values) => updateMutation.mutate({ id, data: values })}
        deletePending={deleteMutation.isPending}
        onDelete={(id) => deleteMutation.mutate({ id })}
      />

      <TransfersSection accounts={accountList} />

      {accountList.length > 0 ? <ImportSection accounts={accountList} /> : null}
    </div>
  );
}
