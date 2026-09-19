import { Link, useSearch } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateAccount,
  useDeleteAccount,
  useGetAccountsSuspense,
  useUpdateAccount,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useSettings } from "@/hooks/use-settings";
import { AccountForm } from "../account-form";
import { AccountsTable } from "../accounts-table";
import { ConversionsSection } from "../conversions-section";
import { TransfersSection } from "../transfers-section";

export function AccountsPage() {
  const { t } = useTranslation();
  const { features } = useSettings();

  const [shown, stale] = useDeferredParams(useSearch({ from: "/accounts" }));
  const accounts = useGetAccountsSuspense({
    search: shown.search,
    iban: shown.iban,
    type: shown.type,
    sort: shown.sort,
    direction: shown.direction,
  });
  const allAccounts = useGetAccountsSuspense();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [convertAccountId, setConvertAccountId] = useState<string | null>(null);

  const createMutation = useCreateAccount({
    mutation: {
      onSuccess: () => setCreateOpen(false),
    },
  });
  const updateMutation = useUpdateAccount({
    mutation: {
      onSuccess: () => setEditingId(null),
    },
  });
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const deleteMutation = useDeleteAccount({
    mutation: {
      onSuccess: () => toast.success(t("accounts.archived")),
    },
  });

  const accountList = accounts.data;
  const allAccountList = allAccounts.data;

  return (
    <div className="space-y-10">
      <PageHeader title={t("accounts.title")}>
        {features.import ? (
          <Link to="/import" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <FileUp />
            {t("nav.import")}
          </Link>
        ) : null}
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          {t("accounts.add")}
        </Button>
      </PageHeader>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title={t("accounts.add")}>
        <AccountForm
          pending={createMutation.isPending}
          onSubmit={(values) => createMutation.mutate({ data: values })}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <AccountsTable
        accounts={accountList}
        stale={stale}
        editingId={editingId}
        onEdit={setEditingId}
        onCancelEdit={() => setEditingId(null)}
        updatePending={updateMutation.isPending}
        onUpdate={(id, values) => updateMutation.mutate({ id, data: values })}
        deletingId={deleteMutation.isPending ? (deleteMutation.variables?.id ?? null) : null}
        onDelete={(id) => setDeleteTarget(id)}
        onConvert={features.multiCurrency ? setConvertAccountId : undefined}
      />

      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <TransfersSection accounts={allAccountList} />
      </QueryBoundary>

      {features.multiCurrency ? (
        <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
          <ConversionsSection
            accounts={allAccountList}
            convertAccountId={convertAccountId}
            onConvertAccountChange={setConvertAccountId}
          />
        </QueryBoundary>
      ) : null}

      <ConfirmDeleteDialog
        target={deleteTarget}
        itemLabel={accountList.find((account) => account.id === deleteTarget)?.name ?? undefined}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={(id) => deleteMutation.mutate({ id })}
      />
    </div>
  );
}
