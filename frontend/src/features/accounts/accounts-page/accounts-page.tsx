import { useSearch } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useCreateAccount,
  useDeleteAccount,
  useAccountsSuspense,
  useUpdateAccount,
} from "@/api/generated";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { Modal } from "@/components/modal";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Button } from "@/components/ui/button/button";
import { Panel, Section, SectionTitle } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { AccountBalances } from "@/features/dashboard/account-balances/account-balances";
import { useConfirmedDelete } from "@/hooks/use-confirmed-delete";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useSettings } from "@/hooks/use-settings";
import { AccountForm } from "../account-form/account-form";
import { accountListParams } from "../account-queries";
import { AccountsTable } from "../accounts-table/accounts-table";
import { ConversionsSection } from "../conversions-section";
import { TransfersSection } from "../transfers-section";

export function AccountsPage() {
  const { t } = useTranslation();
  const { features } = useSettings();

  const [shown, stale] = useDeferredParams(useSearch({ from: "/accounts" }));
  const accounts = useAccountsSuspense(accountListParams(shown));
  const allAccounts = useAccountsSuspense();
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
  const deleteMutation = useDeleteAccount({
    mutation: {
      onSuccess: () => toast.success(t("accounts.archived")),
    },
  });

  const accountList = accounts.data;
  const remove = useConfirmedDelete(deleteMutation, accountList, (account) => account.name);
  const editingAccount = accountList.find((account) => account.id === editingId);
  const allAccountList = allAccounts.data;

  return (
    <div className="space-y-5">
      <PageHeader title={t("accounts.title")}>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          {t("accounts.add")}
        </Button>
      </PageHeader>

      <Modal open={createOpen} onOpenChange={setCreateOpen} title={t("accounts.add")}>
        <AccountForm
          pending={createMutation.isPending}
          onSubmit={(values) => createMutation.mutateAsync({ data: values })}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal
        open={Boolean(editingAccount)}
        onClose={() => setEditingId(null)}
        title={t("actions.edit")}
      >
        {editingAccount ? (
          <AccountForm
            initial={editingAccount}
            pending={updateMutation.isPending}
            onSubmit={(values) =>
              updateMutation.mutateAsync({ id: editingAccount.id, data: values })
            }
            onCancel={() => setEditingId(null)}
          />
        ) : null}
      </Modal>

      <Panel>
        <AccountsTable
          accounts={accountList}
          stale={stale}
          onEdit={setEditingId}
          deletingId={remove.pendingId ?? null}
          onDelete={remove.request}
          onConvert={features.multiCurrency ? setConvertAccountId : undefined}
        />
      </Panel>

      {accountList.length > 1 ? (
        <Section>
          <SectionTitle className="mb-4">{t("accounts.share")}</SectionTitle>
          <div className="max-w-2xl">
            <AccountBalances limit={12} />
          </div>
        </Section>
      ) : null}

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

      <ConfirmDeleteDialog {...remove.dialogProps} />
    </div>
  );
}
